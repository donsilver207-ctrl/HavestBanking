import { Shield, Globe, Scale, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const leaders = [
  { name: "Dr. Heinrich Mueller", role: "Chief Executive Officer", bio: "Former Managing Director at Credit Suisse with 30 years in Swiss private banking." },
  { name: "Charlotte Dubois", role: "Chief Compliance Officer", bio: "Previously led AML operations at BNP Paribas. Expert in international regulatory frameworks." },
  { name: "Alexander Koh", role: "Chief Technology Officer", bio: "Built core banking platforms at DBS and Standard Chartered. Fintech innovator." },
  { name: "Isabelle Hartmann", role: "Head of Private Banking", bio: "20 years managing UHNW portfolios across Zurich, Geneva, and Singapore." },
]

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              About Helvetica Bank
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Founded on the principles of Swiss banking tradition, Helvetica
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
              { icon: Shield, title: "Swiss Regulated", desc: "Operating under Swiss FINMA regulatory framework." },
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

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
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
