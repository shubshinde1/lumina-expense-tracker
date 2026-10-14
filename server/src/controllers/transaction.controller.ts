import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { Transaction } from "../models/Transaction";
import { Category } from "../models/Category";
import { Notification } from "../models/Notification";
import { PaymentMode } from "../models/PaymentMode";
import { parseSmsRules } from "../utils/smsRules";

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
    const { type, amount, description, date, category, subcategory, location, paymentMode, subPaymentMode, metadata } = req.body;
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
      subPaymentMode: subPaymentMode || undefined,
    });

    const smsHash = typeof metadata?.smsHash === "string" ? metadata.smsHash : "";
    const rawSms = typeof metadata?.rawSms === "string" ? metadata.rawSms : "";
    if (smsHash || rawSms) {
      try {
        const existingNotif = smsHash
          ? await Notification.findOne({
              user: userId,
              type: "transaction",
              "metadata.smsHash": smsHash,
            })
          : await Notification.findOne({
              user: userId,
              type: "transaction",
              "metadata.smsText": rawSms,
            });

        if (!existingNotif) {
          const isIncome = transaction.type === "income";
          const label = description || "SMS";
          await Notification.create({
            user: userId,
            title: isIncome ? "Credited (Income)" : "Debited (Spend)",
            message: `Logged ${isIncome ? "income" : "spend"} of ₹${transaction.amount} at ${label}.`,
            type: "transaction",
            actionUrl: "/dashboard/history",
            metadata: {
              amount: String(transaction.amount),
              description: String(label),
              type: transaction.type,
              smsText: rawSms,
              smsHash,
              transactionId: transaction._id.toString(),
            },
          });
        }
      } catch (notifyError) {
        console.error("Failed to create SMS transaction notification:", notifyError);
      }
    }

    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, type, startDate, endDate, search, updatedSince } = req.query;

    if (updatedSince) {
      const sinceDate = new Date(parseInt(updatedSince as string) || 0);
      const deltaTransactions = await Transaction.find({
        user: req.user._id,
        updatedAt: { $gt: sinceDate }
      }).populate("category", "name icon color subcategories");
      res.json(deltaTransactions);
      return;
    }

    const query: any = { user: req.user._id, deleted: { $ne: true } };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { description: searchRegex },
        { paymentMode: searchRegex },
        { "location.address": searchRegex }
      ];
    }

    if (page) {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skipNum = (pageNum - 1) * limitNum;

      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .populate("category", "name icon color subcategories");

      const total = await Transaction.countDocuments(query);

      // Aggregate sum for active query balance
      const sumResult = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
            },
            totalExpense: {
              $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
            }
          }
        }
      ]);
      const totalBalance = sumResult.length > 0 
        ? sumResult[0].totalIncome - sumResult[0].totalExpense 
        : 0;

      res.json({
        transactions,
        total,
        totalBalance,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      });
    } else {
      const transactions = await Transaction.find(query)
        .sort({ date: -1 })
        .populate("category", "name icon color subcategories");
      res.json(transactions);
    }
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
    const { type, amount, description, date, category, subcategory, location, paymentMode, subPaymentMode } = req.body;
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { type, amount, description, date, category, subcategory, location, paymentMode, subPaymentMode },
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
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { deleted: true },
      { new: true }
    );
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
  subPaymentMode?: string | null;
  parserUsed: string;
  geminiError?: string | null;
}

export const parseTransactionTextHelper = async (text: string, userId: any): Promise<ParsedResult> => {
  let geminiError: string | null = null;
  const categories = await Category.find({
    $or: [{ user: userId }, { isGlobal: true }]
  });
  const paymentModes = await PaymentMode.find({
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

      const paymentModesPromptList = paymentModes.map(m => {
        const subs = m.subPaymentModes
          .filter((s: any) => !m.isGlobal || s.user?.toString() === userId.toString())
          .map((s: any) => s.name);
        return {
          name: m.name,
          subPaymentModes: subs
        };
      });

      const prompt = `You are an expert financial transaction parser. Parse the following input text (which could be a natural speech transcription or bank/UPI transaction SMS) into a structured JSON transaction object.

CRITICAL: If the user states a mathematical addition (e.g., "1200 + 120" or "1200 rupees plus 120 rupees"), evaluate the math expression and set the "amount" field to the calculated final sum.

DIRECTION RULES:
- The verb next to the amount decides type. Use the earliest real transaction phrase.
- "debited", "paid to", "sent to", "withdrawn", "spent", "purchase of", and "received by <merchant>" are expense.
- "credited to your account", "received from", "deposited", "salary", and "transferred to your account" are income.
- "transferred to <name or VPA>" is an expense.
- A later disclaimer such as "will be credited back", or the word "cashback" inside a debit SMS, is NOT income.
- Ignore available balance, Avl Bal, and Bal figures. The amount is the figure next to the transaction verb, not the balance.

Available categories in our database:
${JSON.stringify(categoriesPromptList, null, 2)}

Available payment modes in our database:
${JSON.stringify(paymentModesPromptList, null, 2)}

Respond ONLY with a valid JSON object matching this schema:
{
  "type": "income" | "expense",
  "amount": number,
  "description": "Short description of the spend/income (e.g. Starbucks Coffee, Zomato Order, Salary)",
  "category": "String (choose the _id of the best matching category from the list above, default to a general category ID if none fits)",
  "subcategory": "String (choose the _id of the best matching subcategory from the chosen category's subcategories array, or null if none fits)",
  "paymentMode": "String (choose the name of the best matching parent payment mode from the payment modes list above, default to 'UPI')",
  "subPaymentMode": "String (choose the name of the best matching sub-payment mode from the chosen parent payment mode's subPaymentModes list, or null if none fits)"
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
  const rules = parseSmsRules(text);
  const lowerText = text.toLowerCase();
  const type = rules.type;
  const amount = rules.amount;
  const paymentMode = rules.paymentMode;
  const subPaymentMode = rules.subPaymentMode || "";

  let matchedCategory = categories.find((c) => c.type === type);
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

  if (!foundMatch && rules.categoryName) {
    const named = categories.find((c) => c.name.toLowerCase() === rules.categoryName.toLowerCase());
    if (named) matchedCategory = named;
  }

  let description = rules.merchant || text.trim();
  if (!rules.merchant && text.length > 40) {
    description = text.slice(0, 37) + "...";
  }

  return {
    type,
    amount,
    description,
    category: matchedCategory ? matchedCategory._id.toString() : categories[0]?._id?.toString() || "",
    subcategory: matchedSubcategory,
    paymentMode,
    subPaymentMode: subPaymentMode || undefined,
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
    const { smsText, smsHash, parsedTransaction } = req.body;
    const actualSmsText = smsText || req.body.rawSms;
    console.log(`\n[SMS-READER DEBUG] === Incoming Auto-Log Request ===`);
    console.log(`[SMS-READER DEBUG] SMS Body: "${actualSmsText}"`);
    console.log(`[SMS-READER DEBUG] SMS Hash: "${smsHash}"`);
    console.log(`[SMS-READER DEBUG] User ID:  ${req.user._id} (${req.user.email})`);

    if (!actualSmsText) {
      console.log(`[SMS-READER DEBUG] Failed: Missing SMS text.`);
      res.status(400).json({ message: "SMS text is required" });
      return;
    }

    if (req.user.settings && (req.user.settings as any).smsParserActive === false) {
      console.log(`[SMS-READER DEBUG] Blocked: SMS Parser is deactivated in User settings.`);
      res.status(400).json({ message: "SMS parser is deactivated in settings" });
      return;
    }

    const userId = req.user._id;

    // Check for duplicate SMS logs using hash or raw SMS text
    console.log(`[SMS-READER DEBUG] Checking database for duplicate logs...`);
    let existingNotif;
    if (smsHash) {
      existingNotif = await Notification.findOne({
        user: userId,
        type: "transaction",
        "metadata.smsHash": smsHash
      });
    } else {
      existingNotif = await Notification.findOne({
        user: userId,
        type: "transaction",
        "metadata.smsText": actualSmsText
      });
    }
    
    if (existingNotif) {
      console.log(`[SMS-READER DEBUG] Duplicate detected! SMS already logged. Notification ID: ${existingNotif._id}`);
      
      const metadata = existingNotif.metadata;
      const transactionId = metadata instanceof Map 
        ? metadata.get("transactionId") 
        : (metadata as any)?.transactionId;

      const existingTx = transactionId 
        ? await Transaction.findById(transactionId).populate("category", "name icon color subcategories")
        : null;

      res.status(200).json({
        transaction: existingTx,
        message: "This transaction has already been logged."
      });
      return;
    }

    let parsed;
    if (parsedTransaction) {
      console.log(`[SMS-READER DEBUG] Using pre-parsed client transaction details...`);
      parsed = parsedTransaction;
    } else {
      console.log(`[SMS-READER DEBUG] Forwarding SMS to Gemini NLP parser engine...`);
      parsed = await parseTransactionTextHelper(actualSmsText, userId);
    }
    console.log(`[SMS-READER DEBUG] Extracted details:`, JSON.stringify(parsed, null, 2));

    if (parsed.amount <= 0) {
      console.log(`[SMS-READER DEBUG] Failed: Parser could not extract a valid positive amount.`);
      res.status(400).json({ message: "Could not parse a valid amount from SMS." });
      return;
    }

    console.log(`[SMS-READER DEBUG] Creating Transaction record in MongoDB database...`);
    const transaction = await Transaction.create({
      user: userId,
      type: parsed.direction || parsed.type,
      amount: parsed.amount,
      description: parsed.merchant || parsed.description,
      date: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
      category: parsed.category,
      subcategory: parsed.subcategory || undefined,
      paymentMode: parsed.paymentType || parsed.paymentMode
    });
    console.log(`[SMS-READER DEBUG] Transaction created successfully. ID: ${transaction._id}`);

    // Create an auto-log transaction notification alert in the database
    console.log(`[SMS-READER DEBUG] Creating Notification record in MongoDB database...`);
    const notification = await Notification.create({
      user: userId,
      title: "Transaction Auto-Logged",
      message: `Logged ${(parsed.direction || parsed.type) === 'income' ? 'income' : 'spend'} of ₹${parsed.amount} at ${parsed.merchant || parsed.description} automatically via SMS.`,
      type: "transaction",
      actionUrl: "/dashboard/history",
      metadata: {
        amount: parsed.amount.toString(),
        description: parsed.merchant || parsed.description,
        type: parsed.direction || parsed.type,
        smsText: actualSmsText,
        smsHash: smsHash || "",
        transactionId: transaction._id.toString()
      }
    });
    console.log(`[SMS-READER DEBUG] Notification alert created successfully. ID: ${notification._id}`);

    const populated = await Transaction.findById(transaction._id)
      .populate("category", "name icon color subcategories");

    console.log(`[SMS-READER DEBUG] Auto-log process completed successfully! Returning response.\n`);
    res.status(201).json({
      transaction: populated,
      parsedDetails: parsed
    });
  } catch (error: any) {
    console.error(`[SMS-READER DEBUG] CRITICAL ERROR occurred during auto-logging:`, error);
    res.status(500).json({ message: error.message });
  }
};
