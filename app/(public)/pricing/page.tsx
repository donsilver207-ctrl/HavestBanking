import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { pricingTiers } from "@/lib/mock-data"

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              Pricing & Tiers
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Transparent pricing for every level of offshore banking. Start free
              or go premium.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative border-border ${
                tier.highlighted ? "ring-2 ring-primary" : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
              )}
              <CardContent className="p-8">
                <p className="text-sm font-medium text-muted-foreground">
                  {tier.tier}
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-foreground">
                  {tier.name}
                </h2>
                <p className="mt-4 font-serif text-4xl font-bold text-foreground">
                  {tier.price}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tier.description}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="mt-8 block">
                  <Button
                    variant={tier.highlighted ? "default" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Chart */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-foreground">
            Detailed Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
                  <th className="px-4 py-3 font-medium text-foreground">Standard</th>
                  <th className="px-4 py-3 font-medium text-foreground">Verified</th>
                  <th className="px-4 py-3 font-medium text-foreground">Private</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Balance Cap", "$100,000", "$5,000,000", "Unlimited"],
                  ["SWIFT Access", "Yes", "Yes", "Priority"],
                  ["Card Withdrawals", "Yes", "$10K/month", "Unlimited"],
                  ["FX Access", "No", "Standard rates", "Preferential rates"],
                  ["Corporate Features", "No", "Basic", "Full suite"],
                  ["Support", "Email", "Dedicated Manager", "Dedicated Manager"],
                  ["Multi-Currency", "4 wallet", "4 wallets", "4 wallets"],
                  ["Analytics", "Basic", "Advanced", "Custom Reports"],
                ].map(([feature, ...tiers]) => (
                  <tr key={feature}>
                    <td className="px-4 py-3 text-muted-foreground">{feature}</td>
                    {tiers.map((val, i) => (
                      <td key={i} className="px-4 py-3 text-foreground">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  )
}
