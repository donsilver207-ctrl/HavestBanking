import type { Metadata } from "next"
import { DashboardLayoutClient } from "@/components/dashboard-layout-client"

export const metadata: Metadata = {
  title: {
    default: "Crestmont Banking — Authentication Page",
    template: "%s | Crestmont Banking",
  },
  description:
    "Crestmont Banking offers premier offshore financial services built on Swiss banking tradition. Multi-currency accounts, instant cross-border transfers, and institutional-grade security for individuals and businesses worldwide.",
  keywords: [
    "offshore banking", "Swiss banking", "private banking",
    "multi-currency accounts", "cross-border transfers",
    "wealth management", "Crestmont Banking", "FINMA regulated", "international banking",
  ],
  authors: [{ name: "Crestmont Banking" }],
  creator: "Crestmont Banking",
  publisher: "Crestmont Banking",
  metadataBase: new URL("https://www.crestmontbanking.com"),
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.svg", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.svg", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/favicon.svg", color: "#1D4ED8" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.crestmontbanking.com",
    siteName: "Crestmont Banking",
    title: "Crestmont Banking — Trusted. Secure. Forward.",
    description:
      "Premier offshore banking services built on Swiss banking tradition. FINMA regulated, multi-currency, instant cross-border transfers.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Crestmont Banking — Trusted. Secure. Forward.", type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@CrestmontBank",
    creator: "@CrestmontBank",
    title: "Crestmont Banking — Trusted. Secure. Forward.",
    description:
      "Premier offshore banking services built on Swiss banking tradition. FINMA regulated, multi-currency, instant cross-border transfers.",
    images: ["/og-image.png"],
  },
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
  verification: {
    google: "REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_CODE",
  },
  applicationName: "Crestmont Banking",
  category: "finance",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}