import { CheckCircle2, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { jurisdictions } from "@/lib/mock-data"

export default function JurisdictionsPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Globe className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              Offshore Jurisdictions
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Access premier banking jurisdictions worldwide. Each offers unique
              advantages for wealth management and asset protection.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {jurisdictions.map((j) => (
            <Card key={j.code} className="border-border">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground">
                      {j.name}
                    </h2>
                    <Badge variant="secondary" className="mt-1">
                      {j.code}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Tax Rate</p>
                    <p className="text-sm font-semibold text-foreground">
                      {j.taxRate}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {j.description}
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {j.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-md bg-muted px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Minimum Deposit
                  </p>
                  <p className="font-semibold text-foreground">
                    {j.minDeposit}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-foreground">
            Jurisdiction Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                  {jurisdictions.map((j) => (
                    <th key={j.code} className="px-4 py-3 font-medium text-foreground">{j.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Tax Rate</td>
                  {jurisdictions.map((j) => (
                    <td key={j.code} className="px-4 py-3 text-foreground">{j.taxRate}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Min. Deposit</td>
                  {jurisdictions.map((j) => (
                    <td key={j.code} className="px-4 py-3 text-foreground">{j.minDeposit}</td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">Privacy Laws</td>
                  <td className="px-4 py-3 text-foreground">Strong</td>
                  <td className="px-4 py-3 text-foreground">Strong</td>
                  <td className="px-4 py-3 text-foreground">Moderate</td>
                  <td className="px-4 py-3 text-foreground">Strong</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-muted-foreground">SWIFT Access</td>
                  <td className="px-4 py-3 text-foreground">Yes</td>
                  <td className="px-4 py-3 text-foreground">Yes</td>
                  <td className="px-4 py-3 text-foreground">Yes</td>
                  <td className="px-4 py-3 text-foreground">Limited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
