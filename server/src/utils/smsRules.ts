export interface SmsRuleParse {
  type: "income" | "expense";
  amount: number;
  merchant: string;
  paymentMode: string;
  subPaymentMode?: string;
  categoryName: string;
}

const DIRECTION_RULES: { source: string; type: "income" | "expense" }[] = [
  { source: "transferred\\b(?:\\s+\\S+){0,6}\\s+to your (?:a\\/c|ac|acct|account)\\b", type: "income" },
  { source: "credited to your (?:a\\/c|ac|acct|account)\\b", type: "income" },
  { source: "credited to (?:your )?(?:a\\/c|ac|acct|account)\\b", type: "income" },
  { source: "received by\\s+[a-z0-9@._-]+", type: "expense" },
  { source: "paid\\b(?:\\s+\\S+){0,6}\\s+to\\b", type: "expense" },
  { source: "sent\\b(?:\\s+\\S+){0,6}\\s+to\\b", type: "expense" },
  { source: "transferred\\b(?:\\s+\\S+){0,6}\\s+to\\b", type: "expense" },
  { source: "purchase of\\b", type: "expense" },
  { source: "\\bdebited\\b", type: "expense" },
  { source: "\\bwithdrawn\\b", type: "expense" },
  { source: "\\bspent\\b", type: "expense" },
  { source: "received from\\b", type: "income" },
  { source: "\\bdeposited\\b", type: "income" },
  { source: "\\bsalary\\b", type: "income" },
  { source: "\\bcredited(?!\\s+back)\\b", type: "income" },
];

const MERCHANT_SOURCES = [
  "([a-z0-9._-]{2,}@(?:ybl|okhdfc|okaxis|oksbi|okicici|paytm|axl|ibl|upi))\\b",
  "(?:vpa|upi\\s*id)\\s*[:\\-]?\\s*([a-z0-9._-]+@[a-z0-9]+)",
  "info:\\s*upi(?:\\/[^\\s\\/]+){1,8}\\/([A-Za-z][A-Za-z0-9 .@_-]{1,32})",
  "(?:paid|sent|transferred)\\b(?:\\s+\\S+){0,6}\\s+to\\s+([A-Za-z0-9@][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|[.]|$)",
  "\\bat\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)",
  "\\bto\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)",
  "\\bfrom\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)",
  "\\bfor\\s+([A-Za-z][A-Za-z0-9 .@_-]{1,40}?)(?=\\s+via|\\s+on|\\s+ref|\\s+upi|\\s+avl|\\s+has|[.]|$)",
];

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "restaurant", "mcdonalds", "starbucks", "pizza", "kfc", "groceries", "supermarket", "instamart", "blinkit", "zepto", "dining", "dinner", "lunch", "breakfast", "burger", "cafe"],
  Vehicle: ["uber", "ola", "rapido", "cab", "taxi", "fuel", "petrol", "diesel", "shell", "hpcl", "bpcl"],
  Travel: ["irctc", "metro", "flight", "hotel", "bus", "train", "trip", "ticket"],
  Bills: ["electricity", "water", "gas", "recharge", "broadband", "jio", "airtel", "vi", "netflix", "spotify", "youtube", "internet", "wifi", "rent", "bill"],
  Salary: ["salary", "stipend", "payroll", "bonus"],
};

function findDirection(text: string): { type: "income" | "expense"; index: number } {
  const hits: { type: "income" | "expense"; index: number; length: number }[] = [];

  for (const rule of DIRECTION_RULES) {
    const re = new RegExp(rule.source, "gi");
    for (const match of text.matchAll(re)) {
      if (match.index === undefined) continue;
      hits.push({ type: rule.type, index: match.index, length: match[0].length });
    }
  }

  if (hits.length === 0) return { type: "expense", index: -1 };
  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  return { type: hits[0].type, index: hits[0].index };
}

function isBalanceContext(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 28), index).toLowerCase();
  return /\b(avl\.?|bal\.?|balance|available)\b/.test(window);
}

function isAccountDigits(text: string, index: number): boolean {
  const prefix = text.slice(Math.max(0, index - 4), index);
  return /xx|\*\*|x{2,}/i.test(prefix);
}

function collectAmounts(text: string, allowBare: boolean): { value: number; index: number }[] {
  const hits: { value: number; index: number }[] = [];
  const seen = new Set<number>();
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs\.?|inr)\b/gi,
  ];
  if (allowBare) patterns.push(/\b(\d+(?:\.\d{1,2})?)\b/g);

  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const index = match.index ?? 0;
      if (seen.has(index) || isBalanceContext(text, index)) continue;
      if (allowBare && isAccountDigits(text, index)) continue;
      const raw = (match[1] || "").replace(/,/g, "");
      const value = parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0 || value >= 100000000) continue;
      if (allowBare && raw.length === 4 && value >= 1900 && value <= 2100) continue;
      seen.add(index);
      hits.push({ value, index });
    }
  }

  return hits;
}

function pickAmount(text: string, phraseIndex: number): number {
  const currencyHits = collectAmounts(text, false);
  const hits = currencyHits.length > 0 ? currencyHits : collectAmounts(text, true);
  if (hits.length === 0) return 0;
  if (phraseIndex < 0) return hits[0].value;

  hits.sort((a, b) => Math.abs(a.index - phraseIndex) - Math.abs(b.index - phraseIndex));
  return hits[0].value;
}

function sumMathExpression(text: string): number {
  const lower = text.toLowerCase();
  if (!text.includes("+") && !lower.includes("plus") && !/\bsum\b/.test(lower)) return 0;

  const numbers = text.match(/\b\d+(?:\.\d{1,2})?\b/g) || [];
  const valid = numbers
    .map((num) => parseFloat(num))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 1000000);

  if (valid.length < 2) return 0;
  return valid.reduce((total, value) => total + value, 0);
}

function cleanMerchant(raw: string): string | null {
  const merchant = raw.trim().replace(/[.\s]+$/, "");
  if (!merchant || merchant.length > 40) return null;
  if (/^(your|a\/c|ac|acct|account|the|a|an)\b/i.test(merchant)) return null;
  if (/\b(a\/c|account|acct)\b/i.test(merchant)) return null;
  return merchant;
}

function findMerchant(text: string): string {
  for (const source of MERCHANT_SOURCES) {
    const match = text.match(new RegExp(source, "i"));
    if (!match?.[1]) continue;
    const merchant = cleanMerchant(match[1]);
    if (merchant) return merchant;
  }
  return "";
}

export function matchCategoryName(text: string, merchant: string): string {
  const haystack = `${text} ${merchant}`.toLowerCase();
  for (const [name, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => keyword && haystack.includes(keyword))) return name;
  }
  return "";
}

export function mapPaymentMode(text: string): { paymentMode: string; subPaymentMode?: string } {
  const lower = text.toLowerCase();
  let paymentMode = "UPI";

  if (/\bcash\b|\bcod\b|hand cash/.test(lower)) paymentMode = "Cash";
  else if (/credit card|\bcreditcard\b|\bcc\b/.test(lower)) paymentMode = "Credit Card";
  else if (/debit card|\bdebitcard\b|\bdc\b|\bcard\b/.test(lower)) paymentMode = "Debit Card";
  else if (/net banking|netbanking|\bneft\b|\brtgs\b|\bimps\b/.test(lower)) paymentMode = "Net Banking";
  else if (/\bupi\b|gpay|phonepe|paytm|\bbhim\b|@ybl|@okhdfc|@okaxis|@oksbi|@okicici|@paytm/.test(lower)) paymentMode = "UPI";

  let subPaymentMode: string | undefined;
  if (paymentMode === "UPI") {
    if (/phonepe|phone pe/.test(lower)) subPaymentMode = "PhonePe";
    else if (/gpay|google pay/.test(lower)) subPaymentMode = "GPay";
    else if (/paytm/.test(lower)) subPaymentMode = "Paytm";
    else if (/\bcred\b/.test(lower)) subPaymentMode = "Cred";
  } else if (paymentMode === "Net Banking") {
    if (/hdfc/.test(lower)) subPaymentMode = "HDFC";
    else if (/\bsbi\b|state bank/.test(lower)) subPaymentMode = "SBI";
    else if (/icici/.test(lower)) subPaymentMode = "ICICI";
    else if (/axis/.test(lower)) subPaymentMode = "Axis";
  }

  return { paymentMode, subPaymentMode };
}

export function parseSmsRules(text: string): SmsRuleParse {
  const direction = findDirection(text);
  const mathAmount = sumMathExpression(text);
  const amount = mathAmount > 0 ? mathAmount : pickAmount(text, direction.index);
  const merchant = findMerchant(text);
  const payment = mapPaymentMode(text);

  return {
    type: direction.type,
    amount,
    merchant,
    paymentMode: payment.paymentMode,
    subPaymentMode: payment.subPaymentMode,
    categoryName: matchCategoryName(text, merchant),
  };
}
