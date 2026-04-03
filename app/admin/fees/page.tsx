"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const feeSchedule = [
  {
    category: "Transfers",
    items: [
      { name: "Internal Transfer", tier1: "Free", tier2: "Free", tier3: "Free" },
      { name: "SWIFT Transfer", tier1: "$35", tier2: "$25", tier3: "$10" },
      { name: "Wire Transfer", tier1: "$20", tier2: "$15", tier3: "Free" },
      { name: "Urgent Processing", tier1: "$50", tier2: "$35", tier3: "$15" },
    ],
  },
  {
    category: "Account Maintenance",
    items: [
      { name: "Monthly Fee", tier1: "$0", tier2: "$49", tier3: "Custom" },
      { name: "Account Closure", tier1: "$100", tier2: "$50", tier3: "Free" },
      { name: "Statement Generation", tier1: "$5", tier2: "Free", tier3: "Free" },
      { name: "Certificate of Balance", tier1: "$25", tier2: "$15", tier3: "Free" },
    ],
  },
  {
    category: "Cards",
    items: [
      { name: "Card Issuance", tier1: "N/A", tier2: "$25", tier3: "Free" },
      { name: "Card Replacement", tier1: "N/A", tier2: "$15", tier3: "Free" },
      { name: "ATM Withdrawal", tier1: "N/A", tier2: "$2.50", tier3: "Free" },
      { name: "FX Card Transaction", tier1: "N/A", tier2: "1.5%", tier3: "0.5%" },
    ],
  },
  {
    category: "FX & Trading",
    items: [
      { name: "FX Spread", tier1: "0.50%", tier2: "0.15%", tier3: "0.05%" },
      { name: "Large FX (>$100K)", tier1: "N/A", tier2: "0.10%", tier3: "Negotiable" },
    ],
  },
]

const limits = [
  { name: "Daily Transfer Limit", tier1: "$10,000", tier2: "$500,000", tier3: "Unlimited" },
  { name: "Monthly Transfer Limit", tier1: "$50,000", tier2: "$5,000,000", tier3: "Unlimited" },
  { name: "Max Account Balance", tier1: "$100,000", tier2: "$5,000,000", tier3: "Unlimited" },
  { name: "Max Wallets", tier1: "1", tier2: "4", tier3: "Unlimited" },
  { name: "Daily ATM Withdrawal", tier1: "N/A", tier2: "$5,000", tier3: "$50,000" },
]

export default function AdminFeesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Fees & Limits
        </h1>
        <p className="text-sm text-muted-foreground">
          Current fee schedule and account limits by tier
        </p>
      </div>

      {/* Fee Schedule */}
      {feeSchedule.map((category) => (
        <Card key={category.category} className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{category.category}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 text-center font-medium">
                      <Badge variant="outline">Tier 1</Badge>
                    </th>
                    <th className="p-4 text-center font-medium">
                      <Badge>Tier 2</Badge>
                    </th>
                    <th className="p-4 text-center font-medium">
                      <Badge className="bg-primary text-primary-foreground">Tier 3</Badge>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {category.items.map((item) => (
                    <tr key={item.name} className="transition-colors hover:bg-muted/50">
                      <td className="p-4 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {item.tier1}
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {item.tier2}
                      </td>
                      <td className="p-4 text-center text-foreground font-medium">
                        {item.tier3}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Account Limits */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Account Limits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-4 font-medium">Limit</th>
                  <th className="p-4 text-center font-medium">
                    <Badge variant="outline">Tier 1</Badge>
                  </th>
                  <th className="p-4 text-center font-medium">
                    <Badge>Tier 2</Badge>
                  </th>
                  <th className="p-4 text-center font-medium">
                    <Badge className="bg-primary text-primary-foreground">Tier 3</Badge>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {limits.map((item) => (
                  <tr key={item.name} className="transition-colors hover:bg-muted/50">
                    <td className="p-4 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {item.tier1}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {item.tier2}
                    </td>
                    <td className="p-4 text-center text-foreground font-medium">
                      {item.tier3}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
