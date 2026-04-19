import Link from "next/link"

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

function CrestmontLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 680 200"
      className={className}
      aria-label="Crestmont Banking"
      role="img"
    >
      <defs>
        <linearGradient id="ft-tg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="ft-divg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ft-peakL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="ft-peakR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="ft-midL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="ft-midR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="ft-baseL" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1a3a6b" />
        </linearGradient>
        <linearGradient id="ft-baseR" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <clipPath id="ft-emblemClip">
          <circle cx="100" cy="100" r="76" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="76" fill="#1a3a6b" opacity="0.12" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="#1D4ED8" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.4" />

      <g clipPath="url(#ft-emblemClip)">
        <path d="M100,34 L100,68 L62,102 L24,102 Z" fill="url(#ft-peakL)" />
        <path d="M100,34 L176,102 L138,102 L100,68 Z" fill="url(#ft-peakR)" />
        <path d="M100,68 L100,102 L62,136 L24,136 Z" fill="url(#ft-midL)" />
        <path d="M100,68 L176,136 L138,136 L100,102 Z" fill="url(#ft-midR)" />
        <path d="M100,102 L100,166 L62,166 Z" fill="url(#ft-baseL)" />
        <path d="M100,102 L138,166 L100,166 Z" fill="url(#ft-baseR)" />
        <line x1="100" y1="34" x2="100" y2="166" stroke="white" strokeWidth="0.8" opacity="0.2" />
        <line x1="24" y1="102" x2="176" y2="102" stroke="white" strokeWidth="0.8" opacity="0.12" />
        <line x1="24" y1="136" x2="176" y2="136" stroke="white" strokeWidth="0.5" opacity="0.08" />
      </g>

      <line x1="196" y1="44" x2="196" y2="156" stroke="url(#ft-divg)" strokeWidth="1.5" strokeLinecap="round" />

      <text
        x="222" y="97"
        fontFamily="'Montserrat','Inter',system-ui,sans-serif"
        fontSize="48" fontWeight="800" letterSpacing="2"
      >
        <tspan fill="#1a3a6b">CREST</tspan>
        <tspan fill="url(#ft-tg)">MONT</tspan>
      </text>

      <text
        x="226" y="130"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontSize="13.5" fontWeight="400" letterSpacing="14"
        fill="#4a6fa5"
      >
        BANKING
      </text>

      <line x1="222" y1="143" x2="502" y2="143" stroke="#c7d8ef" strokeWidth="0.75" />

      <text
        x="222" y="160"
        fontFamily="'Inter','Segoe UI',system-ui,sans-serif"
        fontSize="10" fontWeight="400" letterSpacing="2.5"
        fill="#6B7280"
      >
        TRUSTED · SECURE · FORWARD
      </text>
    </svg>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="block w-36">
              <CrestmontLogo className="h-auto w-full" />
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
            {"2026 Crestmont Bank AG. All rights reserved. This is a simulated banking platform for demonstration purposes only."}
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