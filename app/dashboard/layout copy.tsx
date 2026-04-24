"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, Bell, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

import type { Metadata } from "next"


// ---------------------------------------------------------------------------
// SEO & Social metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────────
  title: {
    default: "Crestmont Banking — Authentication Page",
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


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden text-sm text-muted-foreground lg:block">
            Welcome back, <span className="font-medium text-foreground">{user?.email?.split("@")[0] || "User"}</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/verification">Verification</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
