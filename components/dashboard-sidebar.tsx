"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  Bell,
  FileText,
  Building2,
  Receipt,
  Shield,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/accounts", icon: Building2, label: "Accounts" },
  { href: "/dashboard/wallets", icon: Wallet, label: "Wallets" },
  { href: "/dashboard/transfers", icon: ArrowLeftRight, label: "Transfers" },
  { href: "/dashboard/beneficiaries", icon: Users, label: "Beneficiaries" },
  { href: "/dashboard/cards", icon: CreditCard, label: "Cards" },
  { href: "/dashboard/transactions", icon: Receipt, label: "Transactions" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/verification", icon: ShieldCheck, label: "Verification" },
  { href: "/dashboard/statements", icon: FileText, label: "Statements" },
  { href: "/dashboard/notifications", icon: Bell, label: "Notifications" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
]

const tierLabel: Record<number, string> = {
  1: "Standard",
  2: "Premium",
  3: "Private Banking",
}

interface Profile {
  first_name: string | null
  last_name: string | null
  tier: number
}
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
export function DashboardSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    
    let profileSub: ReturnType<typeof supabase.channel> | null = null
    let notifSub: ReturnType<typeof supabase.channel> | null = null
  
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
  
      const [profileRes, notifRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, tier").eq("id", user.id).single(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      ])
  
      if (profileRes.data) setProfile(profileRes.data)
      if (notifRes.count !== null) setUnreadCount(notifRes.count)
  
      profileSub = supabase
        .channel("profile-changes")
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        }, (payload) => {
          const { first_name, last_name, tier } = payload.new as Profile
          setProfile({ first_name, last_name, tier })
        })
        .subscribe()
  
      notifSub = supabase
        .channel("notification-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, async () => {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
          if (count !== null) setUnreadCount(count)
        })
        .subscribe()
    }
  
    init()
  
    // This now runs synchronously and the refs are available
    return () => {
      if (profileSub) supabase.removeChannel(profileSub)
      if (notifSub) supabase.removeChannel(notifSub)
    }
  }, [])
  /*useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, notifRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, tier")
          .eq("id", user.id)
          .single(),

        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (notifRes.count !== null) setUnreadCount(notifRes.count)
    }

    fetchProfile()
  }, [])*/

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase() || "?"
    : "…"

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    : "Loading…"

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <CrestmontLogo/>
            <span className="font-serif text-lg font-bold text-sidebar-foreground">
              Crestmont
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

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const isNotif = item.href === "/dashboard/notifications"
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {isNotif && unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground h-5 min-w-5 justify-center px-1 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {fullName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50">
                Tier {profile?.tier ?? "—"} · {tierLabel[profile?.tier ?? 0] ?? ""}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}