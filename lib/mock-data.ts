// Mock data for the banking application

export const transactions = [
  { id: "TXN001", type: "credit", description: "Wire Transfer from UBS AG", amount: 125000, currency: "CHF", date: "2026-02-15", status: "completed" },
  { id: "TXN002", type: "debit", description: "SWIFT Transfer to Barclays", amount: -45000, currency: "GBP", date: "2026-02-14", status: "completed" },
  { id: "TXN003", type: "credit", description: "FX Conversion EUR to USD", amount: 89500, currency: "USD", date: "2026-02-13", status: "completed" },
  { id: "TXN004", type: "debit", description: "Card Withdrawal - Zurich ATM", amount: -2500, currency: "CHF", date: "2026-02-12", status: "completed" },
  { id: "TXN005", type: "credit", description: "Investment Dividend - Q4", amount: 15750, currency: "EUR", date: "2026-02-11", status: "pending" },
  { id: "TXN006", type: "debit", description: "SWIFT Transfer to HSBC HK", amount: -200000, currency: "USD", date: "2026-02-10", status: "flagged" },
  { id: "TXN007", type: "credit", description: "Corporate Account Transfer", amount: 500000, currency: "USD", date: "2026-02-09", status: "completed" },
  { id: "TXN008", type: "debit", description: "Scheduled Payment - Insurance", amount: -8400, currency: "CHF", date: "2026-02-08", status: "completed" },
]

export const wallets = [
  { currency: "USD", symbol: "$", balance: 1250430.50, change: 2.4, flag: "US" },
  { currency: "EUR", symbol: "\u20AC", balance: 845200.00, change: -0.8, flag: "EU" },
  { currency: "GBP", symbol: "\u00A3", balance: 312750.75, change: 1.2, flag: "GB" },
  { currency: "CHF", symbol: "Fr", balance: 2150000.00, change: 0.5, flag: "CH" },
]

export const accounts = [
  {
    id: "ACC001",
    name: "Primary Offshore Account",
    number: "CH93 0076 2011 6238 5295 7",
    iban: "CH9300762011623852957",
    swift: "UBSWCHZH80A",
    jurisdiction: "Switzerland",
    type: "Private Banking",
    balance: 2150000,
    currency: "CHF",
  },
  {
    id: "ACC002",
    name: "USD Trading Account",
    number: "KY-2024-88431",
    iban: "KY82CITI0000088431",
    swift: "CITIKY2L",
    jurisdiction: "Cayman Islands",
    type: "Corporate",
    balance: 1250430.50,
    currency: "USD",
  },
  {
    id: "ACC003",
    name: "EUR Reserve Account",
    number: "SG-2024-77219",
    iban: "SG91HSBC00077219",
    swift: "HSBCSGSG",
    jurisdiction: "Singapore",
    type: "Private Banking",
    balance: 845200,
    currency: "EUR",
  },
]

export const beneficiaries = [
  { id: "BEN001", name: "Goldman Sachs Trust", bank: "Goldman Sachs", swift: "GOLDUS33", iban: "US29GOLD000012345678", country: "United States" },
  { id: "BEN002", name: "Deutsche Bank AG", bank: "Deutsche Bank", swift: "DEUTDEFF", iban: "DE89370400440532013000", country: "Germany" },
  { id: "BEN003", name: "Barclays PLC", bank: "Barclays", swift: "BARCGB22", iban: "GB29BARC20035312345678", country: "United Kingdom" },
  { id: "BEN004", name: "HSBC Holdings", bank: "HSBC", swift: "HSBCHKHH", iban: "HK82HSBC00012345678", country: "Hong Kong" },
]

export const monthlyData = [
  { month: "Sep", inflow: 320000, outflow: 180000 },
  { month: "Oct", inflow: 450000, outflow: 220000 },
  { month: "Nov", inflow: 280000, outflow: 350000 },
  { month: "Dec", inflow: 520000, outflow: 290000 },
  { month: "Jan", inflow: 380000, outflow: 195000 },
  { month: "Feb", inflow: 610000, outflow: 245000 },
]

export const currencyBreakdown = [
  { name: "CHF", value: 47, fill: "hsl(var(--chart-1))" },
  { name: "USD", value: 27, fill: "hsl(var(--chart-2))" },
  { name: "EUR", value: 18, fill: "hsl(var(--chart-3))" },
  { name: "GBP", value: 8, fill: "hsl(var(--chart-4))" },
]

export const jurisdictions = [
  {
    name: "Switzerland",
    code: "CH",
    description: "The gold standard of private banking with centuries of tradition in wealth management and financial discretion.",
    features: ["Bank secrecy laws", "Political neutrality", "Stable currency (CHF)", "World-class regulatory framework"],
    taxRate: "0% on foreign income",
    minDeposit: "$500,000",
  },
  {
    name: "Cayman Islands",
    code: "KY",
    description: "A leading offshore financial center with zero direct taxation and a robust regulatory environment.",
    features: ["Zero income tax", "No capital gains tax", "Strong legal framework", "Fund administration hub"],
    taxRate: "0% all taxes",
    minDeposit: "$250,000",
  },
  {
    name: "Singapore",
    code: "SG",
    description: "Asia's premier wealth management hub with world-class infrastructure and strategic positioning.",
    features: ["Low tax regime", "Treaty network", "Asian market access", "Digital banking leader"],
    taxRate: "0-17% tiered",
    minDeposit: "$200,000",
  },
  {
    name: "Belize",
    code: "BZ",
    description: "An accessible offshore jurisdiction with strong privacy protections and competitive banking options.",
    features: ["Asset protection", "Privacy laws", "Low minimum deposits", "English-speaking"],
    taxRate: "0% offshore income",
    minDeposit: "$50,000",
  },
]

export const pricingTiers = [
  {
    name: "Standard",
    tier: "Tier 1",
    price: "$0",
    description: "Basic offshore account access with essential features.",
    features: [
      "Single currency wallet",
      "Balance cap: $100,000",
      "Basic wire transfers",
      "Email support",
      "Monthly statements",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Verified",
    tier: "Tier 2",
    price: "$49/mo",
    description: "Full-featured banking with multi-currency support and SWIFT access.",
    features: [
      "Multi-currency wallets (4)",
      "Balance cap: $5,000,000",
      "SWIFT transfers",
      "Visa debit card",
      "FX trading access",
      "Priority support",
      "Real-time analytics",
    ],
    cta: "Upgrade Now",
    highlighted: true,
  },
  {
    name: "Private Banking",
    tier: "Tier 3",
    price: "Custom",
    description: "White-glove service for high-net-worth individuals and corporations.",
    features: [
      "Unlimited currencies",
      "No balance cap",
      "Priority SWIFT processing",
      "Platinum card",
      "Dedicated relationship manager",
      "Corporate account features",
      "Multi-signature authorization",
      "Wealth management portfolio",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
]

export const adminUsers = [
  { id: "USR001", name: "Marcus Whitfield", email: "m.whitfield@email.com", tier: 3, status: "active", balance: 4200000, kyc: "approved", country: "UK" },
  { id: "USR002", name: "Sophia Chen", email: "s.chen@email.com", tier: 2, status: "active", balance: 1850000, kyc: "approved", country: "SG" },
  { id: "USR003", name: "Ahmed Al-Rashid", email: "a.rashid@email.com", tier: 2, status: "active", balance: 920000, kyc: "pending", country: "AE" },
  { id: "USR004", name: "Elena Petrova", email: "e.petrova@email.com", tier: 1, status: "frozen", balance: 75000, kyc: "rejected", country: "RU" },
  { id: "USR005", name: "James O'Brien", email: "j.obrien@email.com", tier: 3, status: "active", balance: 8500000, kyc: "approved", country: "IE" },
  { id: "USR006", name: "Yuki Tanaka", email: "y.tanaka@email.com", tier: 2, status: "active", balance: 1200000, kyc: "approved", country: "JP" },
]

export const adminLogs = [
  { id: "LOG001", action: "User KYC Approved", user: "Marcus Whitfield", admin: "Admin", timestamp: "2026-02-15 14:32:00", type: "kyc" },
  { id: "LOG002", action: "Account Frozen", user: "Elena Petrova", admin: "Compliance", timestamp: "2026-02-15 11:20:00", type: "account" },
  { id: "LOG003", action: "Tier Upgraded to 3", user: "James O'Brien", admin: "Admin", timestamp: "2026-02-14 16:45:00", type: "tier" },
  { id: "LOG004", action: "Suspicious Transaction Flagged", user: "Ahmed Al-Rashid", admin: "System", timestamp: "2026-02-14 09:12:00", type: "transaction" },
  { id: "LOG005", action: "FX Rate Updated (EUR/USD)", user: "System", admin: "Admin", timestamp: "2026-02-13 20:00:00", type: "system" },
  { id: "LOG006", action: "Admin Login", user: "Admin", admin: "Admin", timestamp: "2026-02-13 08:00:00", type: "auth" },
]

export const fxRates = [
  { pair: "EUR/USD", rate: 1.0842, change: 0.12 },
  { pair: "GBP/USD", rate: 1.2631, change: -0.08 },
  { pair: "USD/CHF", rate: 0.8821, change: 0.05 },
  { pair: "EUR/GBP", rate: 0.8584, change: 0.20 },
  { pair: "USD/JPY", rate: 149.85, change: -0.32 },
  { pair: "EUR/CHF", rate: 0.9563, change: 0.03 },
]

export const notifications = [
  { id: "NOT001", title: "SWIFT Transfer Completed", message: "Your transfer of $45,000 to Barclays has been completed.", time: "2 hours ago", read: false, type: "transfer" },
  { id: "NOT002", title: "KYC Verification Update", message: "Your Tier 2 verification documents have been approved.", time: "5 hours ago", read: false, type: "kyc" },
  { id: "NOT003", title: "Security Alert", message: "New login detected from Zurich, Switzerland.", time: "1 day ago", read: true, type: "security" },
  { id: "NOT004", title: "FX Rate Alert", message: "EUR/USD has crossed your target rate of 1.085.", time: "1 day ago", read: true, type: "fx" },
  { id: "NOT005", title: "Monthly Statement Ready", message: "Your January 2026 statement is now available for download.", time: "3 days ago", read: true, type: "statement" },
]

export const faqItems = [
  {
    question: "What is offshore banking?",
    answer: "Offshore banking refers to the practice of keeping money in a bank located outside of your country of residence. This can offer benefits such as asset protection, currency diversification, access to international markets, and potential tax efficiencies within legal frameworks.",
  },
  {
    question: "Is offshore banking legal?",
    answer: "Yes, offshore banking is completely legal. It is a legitimate financial strategy used by individuals and businesses worldwide. However, account holders are required to comply with tax reporting requirements in their home country and all applicable international regulations.",
  },
  {
    question: "What documents are required to open an account?",
    answer: "To open an account, you will need a valid government-issued photo ID (passport preferred), proof of address (utility bill or bank statement within 3 months), source of funds documentation, and a completed application form. Tier 2 and Tier 3 accounts require additional verification.",
  },
  {
    question: "How are my funds protected?",
    answer: "Your funds are protected through multiple layers of security including bank-grade encryption, multi-factor authentication, cold storage reserves, real-time AML monitoring, and compliance with international banking regulations. We maintain reserve ratios that exceed regulatory requirements.",
  },
  {
    question: "What currencies are supported?",
    answer: "We support major global currencies including USD, EUR, GBP, and CHF, with the ability to hold multiple currency wallets simultaneously. Currency conversion is available at competitive FX rates with real-time pricing.",
  },
  {
    question: "How do SWIFT transfers work?",
    answer: "SWIFT transfers are processed through the international SWIFT network, enabling secure cross-border transactions to any bank worldwide. Processing typically takes 1-3 business days depending on the destination. Tier 3 clients receive priority processing.",
  },
  {
    question: "What are the account tiers?",
    answer: "We offer three tiers: Standard (Tier 1) for basic offshore access, Verified (Tier 2) for full multi-currency banking with SWIFT access, and Private Banking (Tier 3) for high-net-worth individuals requiring white-glove service with unlimited features.",
  },
]
