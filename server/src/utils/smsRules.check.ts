import { parseSmsRules } from "./smsRules";

const fixtures: { name: string; text: string; type: "income" | "expense"; amount: number }[] = [
  {
    name: "debit with credited-back disclaimer",
    text: "Rs.500.00 debited from A/c **1234 on 14-10-26 to SWIGGY. If not done by you, the amount will be credited back. Avl Bal: Rs.12000.00",
    type: "expense",
    amount: 500,
  },
  {
    name: "UPI paid to merchant",
    text: "You paid Rs.120 to Swiggy via UPI. Payment received by Swiggy.",
    type: "expense",
    amount: 120,
  },
  {
    name: "NEFT credited to account",
    text: "INR 5,000.00 credited to your a/c XX1234 on 14-Oct-26 by NEFT.",
    type: "income",
    amount: 5000,
  },
  {
    name: "balance printed before debit amount",
    text: "Avl Bal Rs.12,000.00. Your a/c XX1234 has been debited for Rs.250.00 towards UPI/SWIGGY.",
    type: "expense",
    amount: 250,
  },
  {
    name: "transfer into your account",
    text: "Rs 5,000 transferred to your account",
    type: "income",
    amount: 5000,
  },
  {
    name: "transfer to a VPA",
    text: "Rs 250 transferred to swiggy@ybl",
    type: "expense",
    amount: 250,
  },
];

let failed = 0;

for (const fixture of fixtures) {
  const result = parseSmsRules(fixture.text);
  if (result.type !== fixture.type || result.amount !== fixture.amount) {
    failed += 1;
    console.error(
      `FAIL ${fixture.name}: expected ${fixture.type} ${fixture.amount}, got ${result.type} ${result.amount}`
    );
  } else {
    console.log(`ok ${fixture.name}`);
  }
}

if (failed > 0) {
  throw new Error(`${failed} SMS rule fixture(s) failed`);
}

console.log("All SMS rule fixtures passed");
