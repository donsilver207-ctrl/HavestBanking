import { Shield, Lock, Eye, Database, Fingerprint, FileWarning } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const securityFeatures = [
  {
    icon: Lock,
    title: "256-Bit AES Encryption",
    description: "All data at rest and in transit is encrypted using military-grade AES-256 encryption. Your financial information is protected by the same standards used by intelligence agencies worldwide.",
  },
  {
    icon: Eye,
    title: "AML Monitoring",
    description: "Real-time anti-money laundering monitoring screens every transaction against global watchlists, sanctions databases, and suspicious activity patterns. Automated alerts ensure immediate compliance response.",
  },
  {
    icon: Shield,
    title: "Transaction Screening",
    description: "Every inbound and outbound transaction undergoes multi-layered screening against OFAC, EU, and UN sanctions lists. PEP (Politically Exposed Persons) screening is applied to all account holders.",
  },
  {
    icon: Database,
    title: "Cold Storage Reserves",
    description: "A significant portion of client assets are held in cold storage reserves, isolated from online systems. This provides an additional layer of protection against cyber threats and unauthorized access.",
  },
  {
    icon: Fingerprint,
    title: "Multi-Factor Authentication",
    description: "All accounts are protected by mandatory two-factor authentication. Tier 3 clients have access to hardware security keys and biometric authentication for the highest level of account security.",
  },
  {
    icon: FileWarning,
    title: "Regulatory Compliance",
    description: "Full compliance with FATF recommendations, Swiss FINMA regulations, and international KYC/AML standards. Regular third-party audits ensure our security measures exceed industry requirements.",
  },
]

export default function SecurityPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              Security & Compliance
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your assets deserve the highest level of protection. Our
              multi-layered security infrastructure ensures your wealth is safe.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {securityFeatures.map((feature) => (
            <Card key={feature.title} className="border-border">
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

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
              Certifications & Standards
            </h2>
            <p className="mt-4 text-muted-foreground">
              We adhere to the highest international standards for financial
              security and data protection.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              "ISO 27001 Certified",
              "SOC 2 Type II Compliant",
              "PCI DSS Level 1",
              "GDPR Compliant",
            ].map((cert) => (
              <div
                key={cert}
                className="rounded-lg border border-border p-4 text-center"
              >
                <Shield className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">{cert}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
