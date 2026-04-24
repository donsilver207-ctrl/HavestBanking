"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Shield,
  ArrowRightLeft,
  DollarSign,
  Receipt,
  ScrollText,
  X,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kyc", label: "KYC Review", icon: Shield },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/admin/fx-rates", label: "Statments", icon: DollarSign },
  { href: "/admin/mails", label: "Emails", icon: Receipt },
  { href: "/admin/logs", label: "Audit Logs", icon: ScrollText },
]
function CrestmontLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="32" height="32" role="img">
      <title>Crestmont Banking logo</title>
      <defs>
        <linearGradient id="peakL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a3a6b" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="peakR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="midL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="midR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="baseL" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1a3a6b" />
        </linearGradient>
        <linearGradient id="baseR" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <clipPath id="emblemClip">
          <circle cx="100" cy="100" r="76" />
        </clipPath>
      </defs>

      <circle cx="100" cy="100" r="76" fill="#1a3a6b" opacity="0.12" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="#1D4ED8" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#3B82F6" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.4" />

      <g clipPath="url(#emblemClip)">
        <path d="M100,34 L100,68 L62,102 L24,102 Z" fill="url(#peakL)" />
        <path d="M100,34 L176,102 L138,102 L100,68 Z" fill="url(#peakR)" />
        <path d="M100,68 L100,102 L62,136 L24,136 Z" fill="url(#midL)" />
        <path d="M100,68 L176,136 L138,136 L100,102 Z" fill="url(#midR)" />
        <path d="M100,102 L100,166 L62,166 Z" fill="url(#baseL)" />
        <path d="M100,102 L138,166 L100,166 Z" fill="url(#baseR)" />
        <line x1="100" y1="34" x2="100" y2="166" stroke="white" strokeWidth="0.8" opacity="0.2" />
        <line x1="24" y1="102" x2="176" y2="102" stroke="white" strokeWidth="0.8" opacity="0.12" />
        <line x1="24" y1="136" x2="176" y2="136" stroke="white" strokeWidth="0.5" opacity="0.08" />
      </g>
    </svg>
  )
}
export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <CrestmontLogo />
            <span className="font-serif text-lg font-bold text-sidebar-foreground">
              Admin
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/admin" && pathname.startsWith(link.href))
              const Icon = link.icon
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            Switch to Dashboard
          </Link>
        </div>
      </aside>
    </>
  )
}
