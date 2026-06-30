import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Transaction } from "../models/Transaction";
import { Category } from "../models/Category";

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

export const parseNaturalLanguage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ message: "Text input is required" });
      return;
    }

    const userId = req.user._id;

    // Fetch all user and global categories
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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
          throw new Error(`Gemini API responded with status ${response.status}`);
        }

        const result: any = await response.json();
        const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (parsedText) {
          const parsedJson = JSON.parse(parsedText.trim());
          res.json(parsedJson);
          return;
        }
      } catch (err: any) {
        console.warn("Gemini parsing failed, falling back to local parser:", err.message);
      }
    }

    // LOCAL RULE-BASED FALLBACK PARSER (Works completely offline & costs $0)
    const lowerText = text.toLowerCase();

    // 1. Amount Extraction
    let amount = 0;

    // Check for mathematical addition keywords first (e.g. "1200 + 120", "1200 plus 120", "add 500 and 200")
    const hasAdditionKeyword = lowerText.includes("+") || lowerText.includes("plus") || lowerText.includes("add") || lowerText.includes("sum");
    if (hasAdditionKeyword) {
      // Find all numbers in the text (ignoring common multi-digit codes like account suffixes or years)
      const numbers = text.match(/\b\d+(?:\.\d{1,2})?\b/g);
      // We only sum if there are multiple numbers and they are likely transactional amounts (e.g. not a 4-digit year like 2026)
      if (numbers && numbers.length > 1) {
        const validNumbers = numbers
          .map((num: string) => parseFloat(num))
          .filter((val: number) => !isNaN(val) && val > 0 && val < 1000000); // Filter out extremely large numbers/years if any

        if (validNumbers.length > 1) {
          amount = validNumbers.reduce((acc: number, val: number) => acc + val, 0);
        }
      }
    }

    // Fallback to standard regex amount extraction if no addition matches were evaluated
    if (amount === 0) {
      // Regex for standard Indian/international currency formats: ₹/Rs/INR/Rs. followed by amount
      const amountRegexes = [
        /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
        /debited\s*(?:for|with)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /spent\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /credited\s*(?:with)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
        /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs|inr)/i,
        /\b([\d,]+\.\d{2})\b/ // any decimal number with 2 decimal places
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

    // If still 0, look for any standalone number
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
    let matchedCategory = categories.find(c => c.type === type); // default category fallback
    let matchedSubcategory = null;
    let foundMatch = false;

    // Search all subcategories across all categories first to see if any subcategory matches the text directly
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

    // If no subcategory matched directly, search parent category names
    if (!foundMatch) {
      for (const cat of categories) {
        const catNameLower = cat.name.toLowerCase();
        let isMatch = lowerText.includes(catNameLower);

        if (!isMatch) {
          // Synonym matches
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
    // If it's a long SMS, truncate/extract cleaner description
    if (text.length > 40) {
      // Look for patterns like "at [Merchant]" or "to [Merchant]"
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

    res.json({
      type,
      amount,
      description,
      category: matchedCategory ? matchedCategory._id.toString() : categories[0]?._id?.toString() || "",
      subcategory: matchedSubcategory,
      paymentMode
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
