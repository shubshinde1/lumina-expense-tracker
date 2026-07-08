import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Transaction } from "../models/Transaction";
import { Category } from "../models/Category";
import { Notification } from "../models/Notification";

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user._id;

    const transactions = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .limit(5)
      .populate("category", "name icon color subcategories");

    const totals = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let income = 0;
    let expense = 0;
    totals.forEach((t) => {
      if (t._id === "income") income = t.total;
      if (t._id === "expense") expense = t.total;
    });

    res.json({
      balance: income - expense,
      income,
      expense,
      recentTransactions: transactions,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { type, amount, description, date, category, subcategory, location, paymentMode } = req.body;
    const userId = req.user._id;

    const transaction = await Transaction.create({
      user: userId,
      type,
      amount,
      description,
      date: date || Date.now(),
      category,
      subcategory,
      location,
      paymentMode: paymentMode || 'UPI',
    });

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ date: -1 })
      .populate("category", "name icon color subcategories");
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate("category", "name icon color subcategories");
    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, amount, description, date, category, subcategory, location, paymentMode } = req.body;
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { type, amount, description, date, category, subcategory, location, paymentMode },
      { new: true }
    );
    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Transaction removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export interface ParsedResult {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subcategory: string | null;
  paymentMode: string;
  parserUsed: string;
  geminiError?: string | null;
}

export const parseTransactionTextHelper = async (text: string, userId: any): Promise<ParsedResult> => {
  let geminiError: string | null = null;
  const categories = await Category.find({
    $or: [{ user: userId }, { isGlobal: true }]
  });

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const categoriesPromptList = categories.map(c => ({
        _id: c._id.toString(),
        name: c.name,
        type: c.type,
        subcategories: c.subcategories.map((s: any) => ({
          _id: s._id.toString(),
          name: s.name
        }))
      }));

      const prompt = `You are an expert financial transaction parser. Parse the following input text (which could be a natural speech transcription or bank/UPI transaction SMS) into a structured JSON transaction object.

CRITICAL: If the user states a mathematical addition (e.g., "1200 + 120" or "1200 rupees plus 120 rupees"), evaluate the math expression and set the "amount" field to the calculated final sum.

Available categories in our database:
${JSON.stringify(categoriesPromptList, null, 2)}

Respond ONLY with a valid JSON object matching this schema:
{
  "type": "income" | "expense",
  "amount": number,
  "description": "Short description of the spend/income (e.g. Starbucks Coffee, Zomato Order, Salary)",
  "category": "String (choose the _id of the best matching category from the list above, default to a general category ID if none fits)",
  "subcategory": "String (choose the _id of the best matching subcategory from the chosen category's subcategories array, or null if none fits)",
  "paymentMode": "Cash" | "UPI" | "Net Banking" | "Credit Card" | "Debit Card" (infer from context, default to "UPI")
}

Text to parse:
"${text}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error payload:", errorText);
        throw new Error(`Google API Rejection (Status ${response.status}): ${errorText}`);
      }

      const result: any = await response.json();
      const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (parsedText) {
        const parsedJson = JSON.parse(parsedText.trim());
        return {
          ...parsedJson,
          parserUsed: "Gemini 2.5 Flash API"
        };
      }
    } catch (err: any) {
      geminiError = err.message || JSON.stringify(err) || "Unknown Gemini API error";
      console.warn("Gemini parsing failed, falling back to local parser:", err.message);
    }
  }

  // LOCAL RULE-BASED FALLBACK PARSER (Works completely offline & costs $0)
  const lowerText = text.toLowerCase();

  // 1. Amount Extraction
  let amount = 0;

  // Check for mathematical addition keywords first
  const hasAdditionKeyword = lowerText.includes("+") || lowerText.includes("plus") || lowerText.includes("add") || lowerText.includes("sum");
  if (hasAdditionKeyword) {
    const numbers = text.match(/\b\d+(?:\.\d{1,2})?\b/g);
    if (numbers && numbers.length > 1) {
      const validNumbers = numbers
        .map((num: string) => parseFloat(num))
        .filter((val: number) => !isNaN(val) && val > 0 && val < 1000000);

      if (validNumbers.length > 1) {
        amount = validNumbers.reduce((acc: number, val: number) => acc + val, 0);
      }
    }
  }

  if (amount === 0) {
    const amountRegexes = [
      /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /debited\s*(?:for|with)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /spent\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /credited\s*(?:with)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs|inr)/i,
      /\b([\d,]+\.\d{2})\b/
    ];

    for (const regex of amountRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          amount = val;
          break;
        }
      }
    }
  }

  if (amount === 0) {
    const standaloneNum = text.match(/\b\d+\b/);
    if (standaloneNum) {
      amount = parseFloat(standaloneNum[0]);
    }
  }

  // 2. Transaction Type Extraction
  let type: "income" | "expense" = "expense";
  const incomeKeywords = ["salary", "credited", "received", "added", "refund", "won", "deposited", "bonus", "gift", "cashback"];
  const hasIncomeKeyword = incomeKeywords.some(keyword => lowerText.includes(keyword));
  if (hasIncomeKeyword) {
    type = "income";
  }

  // 3. Category & Subcategory matching
  let matchedCategory = categories.find(c => c.type === type);
  let matchedSubcategory = null;
  let foundMatch = false;

  for (const cat of categories) {
    if (cat.subcategories && cat.subcategories.length > 0) {
      for (const sub of cat.subcategories) {
        if (lowerText.includes(sub.name.toLowerCase())) {
          matchedCategory = cat;
          matchedSubcategory = sub._id.toString();
          foundMatch = true;
          break;
        }
      }
    }
    if (foundMatch) break;
  }

  if (!foundMatch) {
    for (const cat of categories) {
      const catNameLower = cat.name.toLowerCase();
      let isMatch = lowerText.includes(catNameLower);

      if (!isMatch) {
        if (catNameLower === "food") {
          isMatch = ["restaurant", "swiggy", "zomato", "dining", "dinner", "lunch", "breakfast", "pizza", "burger", "cafe", "tea", "starbucks", "groceries", "eats"].some(k => lowerText.includes(k));
        } else if (catNameLower === "vehicle" || catNameLower === "travel") {
          isMatch = ["fuel", "petrol", "diesel", "gas", "car", "service", "uber", "ola", "flight", "hotel", "bus", "train", "trip", "ticket", "cab"].some(k => lowerText.includes(k));
        } else if (catNameLower === "bills") {
          isMatch = ["electricity", "broadband", "internet", "wifi", "recharge", "phone", "subscription", "netflix", "spotify", "rent", "water", "bill"].some(k => lowerText.includes(k));
        } else if (catNameLower === "salary") {
          isMatch = ["stipend", "pay", "income", "job", "salary", "bonus"].some(k => lowerText.includes(k));
        }
      }

      if (isMatch) {
        matchedCategory = cat;
        break;
      }
    }
  }

  // 4. Description
  let description = text.trim();
  if (text.length > 40) {
    const merchantMatch = text.match(/(?:at|to|info)\s+([A-Za-z0-9\s]+?)(?:\s+via|\s+on|\s+ref|\s+txn|rs|\b\d|\.)/i);
    if (merchantMatch && merchantMatch[1]) {
      description = merchantMatch[1].trim();
    } else {
      description = text.slice(0, 37) + "...";
    }
  }

  // 5. Payment Mode
  let paymentMode = "UPI";
  if (lowerText.includes("cash") || lowerText.includes("cod") || lowerText.includes("hand cash")) {
    paymentMode = "Cash";
  } else if (lowerText.includes("credit card") || lowerText.includes("cc") || lowerText.includes("creditcard")) {
    paymentMode = "Credit Card";
  } else if (lowerText.includes("debit card") || lowerText.includes("dc") || lowerText.includes("debitcard") || lowerText.includes("card")) {
    paymentMode = "Debit Card";
  } else if (lowerText.includes("net banking") || lowerText.includes("netbanking") || lowerText.includes("transfer") || lowerText.includes("neft") || lowerText.includes("rtgs") || lowerText.includes("imps")) {
    paymentMode = "Net Banking";
  } else if (lowerText.includes("upi") || lowerText.includes("gpay") || lowerText.includes("phonepe") || lowerText.includes("paytm") || lowerText.includes("bhim") || lowerText.includes("scan")) {
    paymentMode = "UPI";
  }

  return {
    type,
    amount,
    description,
    category: matchedCategory ? matchedCategory._id.toString() : categories[0]?._id?.toString() || "",
    subcategory: matchedSubcategory,
    paymentMode,
    parserUsed: "Local Rule-Based Parser",
    geminiError
  };
};

export const parseNaturalLanguage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ message: "Text input is required" });
      return;
    }

    const userId = req.user._id;
    const parsedResult = await parseTransactionTextHelper(text, userId);
    res.json(parsedResult);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const autoLogSmsTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { smsText } = req.body;
    if (!smsText) {
      res.status(400).json({ message: "SMS text is required" });
      return;
    }

    const userId = req.user._id;
    const parsed = await parseTransactionTextHelper(smsText, userId);

    if (parsed.amount <= 0) {
      res.status(400).json({ message: "Could not parse a valid amount from SMS." });
      return;
    }

    const transaction = await Transaction.create({
      user: userId,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      date: new Date(),
      category: parsed.category,
      subcategory: parsed.subcategory || undefined,
      paymentMode: parsed.paymentMode
    });

    // Create an auto-log transaction notification alert in the database
    await Notification.create({
      user: userId,
      title: "Transaction Auto-Logged",
      message: `Logged ${parsed.type === 'income' ? 'income' : 'spend'} of ₹${parsed.amount} at ${parsed.description} automatically via SMS.`,
      type: "transaction",
      actionUrl: "/dashboard/history",
      metadata: {
        amount: parsed.amount.toString(),
        description: parsed.description,
        type: parsed.type,
        smsText: smsText,
        transactionId: transaction._id.toString()
      }
    });

    const populated = await Transaction.findById(transaction._id)
      .populate("category", "name icon color subcategories");

    res.status(201).json({
      transaction: populated,
      parsedDetails: parsed
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
