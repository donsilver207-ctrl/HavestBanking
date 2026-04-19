import type { Metadata } from "next"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"

// ---------------------------------------------------------------------------
// SEO & Social metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────────
  title: {
    default: "Crestmont Banking — Trusted. Secure. Forward.",
    template: "%s | Crestmont Banking",
  },
  description:
    "Crestmont Banking offers premier offshore financial services built on Swiss banking tradition. Multi-currency accounts, instant cross-border transfers, and institutional-grade security for individuals and businesses worldwide.",
  keywords: [
    "offshore banking",
    "Swiss banking",
    "private banking",
    "multi-currency accounts",
    "cross-border transfers",
    "wealth management",
    "Crestmont Banking",
    "FINMA regulated",
    "international banking",
  ],
  authors: [{ name: "Crestmont Banking" }],
  creator: "Crestmont Banking",
  publisher: "Crestmont Banking",
  metadataBase: new URL("https://www.crestmontbanking.com"),
  alternates: {
    canonical: "/",
  },

  // ── Favicon / Icons ───────────────────────────────────────────────────────
  icons: {
    // SVG favicon — modern browsers use this first
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.svg", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.svg", sizes: "16x16", type: "image/png" },
    ],
    // Apple touch icon (180×180 PNG recommended)
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    // Windows / Android
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#1D4ED8" },
    ],
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp, Slack…) ────────────────────
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.crestmontbanking.com",
    siteName: "Crestmont Banking",
    title: "Crestmont Banking — Trusted. Secure. Forward.",
    description:
      "Premier offshore banking services built on Swiss banking tradition. FINMA regulated, multi-currency, instant cross-border transfers.",
    images: [
      {
        url: "/og-image.png",          // 1200×630 recommended
        width: 1200,
        height: 630,
        alt: "Crestmont Banking — Trusted. Secure. Forward.",
        type: "image/png",
      },
    ],
  },

  // ── Twitter / X ───────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    site: "@CrestmontBank",           // update to your actual handle
    creator: "@CrestmontBank",
    title: "Crestmont Banking — Trusted. Secure. Forward.",
    description:
      "Premier offshore banking services built on Swiss banking tradition. FINMA regulated, multi-currency, instant cross-border transfers.",
    images: ["/og-image.png"],        // 1200×628 recommended
  },

  // ── Robots ────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification (add your own codes from each platform) ─────────────────
  verification: {
    google: "REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_CODE",
    // yandex: "REPLACE_WITH_YANDEX_CODE",
    // other: { "facebook-domain-verification": ["REPLACE_WITH_FB_CODE"] },
  },

  // ── App / PWA ─────────────────────────────────────────────────────────────
  applicationName: "Crestmont Banking",
  category: "finance",
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}