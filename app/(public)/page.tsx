import Link from "next/link"
import {
  ArrowRight,
  Shield,
  Globe,
  CreditCard,
  BarChart3,
  Lock,
  Banknote,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TestimonialAvatar } from "@/components/testimonial-avatar"

const features = [
  {
    icon: Globe,
    title: "Multi-Currency Wallets",
    description:
      "Hold and manage USD, EUR, GBP, and CHF in a single unified platform with real-time FX conversion.",
  },
  {
    icon: Banknote,
    title: "SWIFT Transfers",
    description:
      "Send and receive international wire transfers through the global SWIFT network with priority processing.",
  },
  {
    icon: CreditCard,
    title: "PrePaidCards Loading",
    description:
      "Load Prepaid Visa or Mastercard to your offshore account. Withdraw funds globally with configurable limits.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Monitor inflow, outflow, and spending patterns with detailed charts and exportable reports.",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    description:
      "256-bit encryption, 2FA authentication, AML monitoring, and cold storage reserves protect your assets.",
  },
  {
    icon: Shield,
    title: "Regulatory Compliance",
    description:
      "Full KYC/AML compliance with international standards. Your assets are protected by Swiss law.",
  },
]

const testimonials = [
  {
    quote:
      "Helvetica Bank transformed how I manage my international assets. The multi-currency feature alone saved me thousands in conversion fees.",
    author: "Marcus W.",
    role: "Private Client, Tier 3",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    initials: "MW",
  },
  {
    quote:
      "The level of security and compliance gives me complete peace of mind. Their KYC process was thorough yet efficient.",
    author: "Sophia C.",
    role: "Corporate Client",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    initials: "SC",
  },
  {
    quote:
      "Priority SWIFT processing and a dedicated relationship manager make cross-border transactions seamless.",
    author: "James O.",
    role: "Private Banking Client",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    initials: "JO",
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('./hero-bg.png')",
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-white" />
              Swiss-Grade Offshore Banking
            </div>
            <h1 className="text-balance font-serif text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
              Offshore Banking. Borderless Wealth.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/80 md:text-xl">
              Secure multi-currency accounts across premier jurisdictions.
              Private banking with SWIFT access, real-time analytics, and
              institutional-grade compliance.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2 px-8">
                  Open Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-white/10 px-8 text-white hover:bg-white/20"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border md:grid-cols-4">
          {[
            { value: "$12B+", label: "Assets Under Management" },
            { value: "4", label: "Jurisdictions" },
            { value: "15,000+", label: "Global Clients" },
            { value: "99.99%", label: "Uptime SLA" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center bg-card px-4 py-8"
            >
              <span className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1 text-xs text-muted-foreground md:text-sm">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance font-serif text-3xl font-bold text-foreground md:text-4xl">
            Banking Without Borders
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Everything you need to manage, grow, and protect your wealth across
            multiple jurisdictions and currencies.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border bg-card transition-colors hover:bg-accent/50"
            >
              <CardContent className="p-6">
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tier Comparison Preview */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-balance font-serif text-3xl font-bold text-foreground md:text-4xl">
              Choose Your Tier
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              From essential offshore access to white-glove private banking.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                tier: "Standard",
                price: "$0",
                features: [
                  "4 currencies",
                  "$100K cap",
                  "8% Interest per Annum",
                ],
              },
              {
                tier: "Verified",
                price: "$49/mo",
                features: [
                  "4 currencies",
                  "$5M cap",
                  "Dedicated manager",
                  "15% Interest per Annum",
                ],
              },
              {
                tier: "Private",
                price: "Custom",
                features: [
                  "4 currencies",
                  "No cap",
                  "Priority SWIFT",
                  "Dedicated manager",
                  "18% Interest per Annum",
                ],
              },
            ].map((tier) => (
              <Card
                key={tier.tier}
                className={`border-border ${
                  tier.tier === "Verified" ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {tier.tier}
                  </h3>
                  <p className="mt-2 font-serif text-3xl font-bold text-foreground">
                    {tier.price}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {tier.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="mt-6 block">
                    <Button
                      variant={tier.tier === "Verified" ? "default" : "outline"}
                      className="w-full"
                    >
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance font-serif text-3xl font-bold text-foreground md:text-4xl">
            Trusted by Global Clients
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.author} className="border-border bg-card">
              <CardContent className="p-6">
                <p className="text-sm italic leading-relaxed text-muted-foreground">
                  {`"${t.quote}"`}
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                  <TestimonialAvatar
                    src={t.avatar}
                    alt={t.author}
                    initials={t.initials}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.author}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
          <h2 className="font-serif text-3xl font-bold text-primary-foreground md:text-4xl">
            Start Banking Without Borders
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Open your offshore account in minutes. No minimum deposit for Tier 1
            accounts.
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="mt-8 gap-2 px-8">
              Open Your Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}