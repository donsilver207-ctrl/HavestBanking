import { Shield, Globe, Scale, Users, MapPin, Phone, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const leaders = [
  { name: "Dr. Heinrich Mueller", role: "Chief Executive Officer", bio: "Former Managing Director at Credit Suisse with 30 years in Swiss private banking." },
  { name: "Charlotte Dubois", role: "Chief Compliance Officer", bio: "Previously led AML operations at BNP Paribas. Expert in international regulatory frameworks." },
  { name: "Alexander Koh", role: "Chief Technology Officer", bio: "Built core banking platforms at DBS and Standard Chartered. Fintech innovator." },
  { name: "Isabelle Hartmann", role: "Head of Private Banking", bio: "20 years managing UHNW portfolios across Zurich, Geneva, and Singapore." },
]

const offices = [
  {
    city: "London",
    label: "Administrative Headquarters",
    labelClass: "bg-primary/10 text-primary",
    address: "One Canada Square, Canary Wharf, London E14 5AB",
    phone: "+44 79 8859 2888",
    note: "Group management, compliance & UK operations",
  },
  {
    city: "New York",
    label: "Administrative Headquarters",
    labelClass: "bg-primary/10 text-primary",
    address: "40 Wall St, New York, NY 10005, USA",
    phone: "+1 302 404 0290",
    note: "North America operations & client relations",
  },
  {
    city: "Prime Tower, Zurich",
    label: "Banking Operations",
    labelClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    address: "Hardstrasse 201, 8005 Zurich, Switzerland",
    phone: "+44 79 8859 2888",
    note: "All regulated banking, custody & financial services",
  },
]

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              About Crestmont Bank
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Founded on the principles of Swiss banking tradition, Crestmont
              Bank provides modern offshore financial services to discerning
              clients worldwide.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
              Our Philosophy
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Offshore banking is a legitimate and essential tool for global
              citizens and businesses. We believe in providing access to
              world-class financial infrastructure while maintaining the highest
              standards of regulatory compliance.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Our platform combines centuries of Swiss banking tradition with
              cutting-edge financial technology, enabling seamless multi-currency
              management, instant cross-border transfers, and institutional-grade
              security.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
              Mission & Vision
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Mission:</strong> To
              democratize access to premier offshore banking services through
              technology, making sophisticated wealth management available to
              qualified individuals and businesses worldwide.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Vision:</strong> A world where
              financial borders do not limit opportunity. Where every client can
              manage, protect, and grow their wealth with the discretion and
              security they deserve.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: "Swiss Regulated", desc: "Banking operations under Swiss FINMA regulatory framework." },
              { icon: Globe, title: "4 Jurisdictions", desc: "Switzerland, Cayman Islands, Singapore, Belize." },
              { icon: Scale, title: "Full Compliance", desc: "KYC/AML aligned with FATF standards." },
              { icon: Users, title: "15,000+ Clients", desc: "Trusted by individuals and corporations worldwide." },
            ].map((item) => (
              <Card key={item.title} className="border-border">
                <CardContent className="p-6 text-center">
                  <item.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where We Operate ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            Where We Operate
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            Crestmont Bank's administrative headquarters are located in the{" "}
            <strong className="text-foreground">United Kingdom</strong> and the{" "}
            <strong className="text-foreground">United States</strong>, overseeing
            group management, technology, and client operations. All regulated
            banking activity — including client accounts, deposits, transfers, and
            custody — is conducted exclusively by{" "}
            <strong className="text-foreground">Crestmont Bank AG, Switzerland</strong>,
            supervised by FINMA.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {offices.map((office) => (
            <Card key={office.city} className="border-border">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${office.labelClass}`}>
                    {office.label}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground">{office.city}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{office.note}</p>

                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {office.address}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    {office.phone}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          Banking licences, client accounts, and all regulated financial activities
          are held and operated solely by Crestmont Bank AG, incorporated in
          Switzerland and supervised by the Swiss Financial Market Supervisory
          Authority (FINMA).
        </p>
      </section>

      <section className="border-t border-border mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="mb-8 text-center font-serif text-2xl font-bold text-foreground md:text-3xl">
          Leadership Team
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {leaders.map((leader) => (
            <Card key={leader.name} className="border-border">
              <CardContent className="p-6">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {leader.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {leader.name}
                </h3>
                <p className="text-sm font-medium text-primary">{leader.role}</p>
                <p className="mt-2 text-sm text-muted-foreground">{leader.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  )
}