import Link from "next/link"
import { Shield } from "lucide-react"

const footerLinks = {
  Banking: [
    { href: "/jurisdictions", label: "Jurisdictions" },
    { href: "/pricing", label: "Pricing & Tiers" },
    { href: "/security", label: "Security" },
    { href: "/faq", label: "FAQ" },
  ],
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/aml-policy", label: "AML Policy" },
    { href: "/kyc-policy", label: "KYC Policy" },
    { href: "/risk-disclosure", label: "Risk Disclosure" },
  ],
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-bold text-foreground">
                Helvetica Bank
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Swiss-grade offshore banking for global citizens. Secure, private,
              and compliant wealth management across borders.
            </p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">
                {title}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            {"2026 Helvetica Bank AG. All rights reserved. This is a simulated banking platform for demonstration purposes only."}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">EN</span>
            <span className="text-xs text-muted-foreground">FR</span>
            <span className="text-xs text-muted-foreground">DE</span>
            <span className="text-xs text-muted-foreground">ES</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
