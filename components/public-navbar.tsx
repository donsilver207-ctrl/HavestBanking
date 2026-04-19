"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/jurisdictions", label: "Jurisdictions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
]

function CrestmontLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 980 300"
      className={className}
      aria-label="Crestmont Banking"
      role="img"
    >
      <defs>
        <linearGradient id="nav-tg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="nav-divg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="45%" stopColor="#3B82F6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="nav-peakL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="nav-peakR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="nav-midL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="nav-midR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="nav-baseL" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1a3a6b" />
        </linearGradient>
        <linearGradient id="nav-baseR" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <clipPath id="nav-emblemClip">
          <circle cx="100" cy="100" r="76" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="76" fill="#1a3a6b" opacity="0.12" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="#1D4ED8" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.4" />

      <g clipPath="url(#nav-emblemClip)">
        <path d="M100,34 L100,68 L62,102 L24,102 Z" fill="url(#nav-peakL)" />
        <path d="M100,34 L176,102 L138,102 L100,68 Z" fill="url(#nav-peakR)" />
        <path d="M100,68 L100,102 L62,136 L24,136 Z" fill="url(#nav-midL)" />
        <path d="M100,68 L176,136 L138,136 L100,102 Z" fill="url(#nav-midR)" />
        <path d="M100,102 L100,166 L62,166 Z" fill="url(#nav-baseL)" />
        <path d="M100,102 L138,166 L100,166 Z" fill="url(#nav-baseR)" />
        <line x1="100" y1="34" x2="100" y2="166" stroke="white" strokeWidth="0.8" opacity="0.2" />
        <line x1="24" y1="102" x2="176" y2="102" stroke="white" strokeWidth="0.8" opacity="0.12" />
        <line x1="24" y1="136" x2="176" y2="136" stroke="white" strokeWidth="0.5" opacity="0.08" />
      </g>

      <line x1="196" y1="44" x2="196" y2="156" stroke="url(#nav-divg)" strokeWidth="1.5" strokeLinecap="round" />

      <text
        x="222" y="97"
        fontFamily="'Montserrat','Inter',system-ui,sans-serif"
        fontSize="48" fontWeight="800" letterSpacing="2"
      >
        <tspan fill="#1a3a6b">CREST</tspan>
        <tspan fill="url(#nav-tg)">MONT</tspan>
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

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="block w-40 shrink-0">
          <CrestmontLogo className="h-auto w-full" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/auth/login" className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register" className="hidden sm:inline-flex">
            <Button size="sm">Open Account</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex gap-2">
              <Link href="/auth/login" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register" className="flex-1">
                <Button className="w-full" size="sm">
                  Open Account
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}