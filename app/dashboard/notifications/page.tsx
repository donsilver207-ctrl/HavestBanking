"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Bell,
  ArrowRightLeft,
  Shield,
  TrendingUp,
  FileText,
  CheckCircle2,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = "transfer" | "kyc" | "security" | "fx" | "statement" | "general"

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const iconMap: Record<NotificationType, React.ElementType> = {
  transfer:  ArrowRightLeft,
  kyc:       CheckCircle2,
  security:  Shield,
  fx:        TrendingUp,
  statement: FileText,
  general:   Bell,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins < 1)   return "Just now"
  if (mins < 60)  return `${mins} minute${mins !== 1 ? "s" : ""} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  if (days < 7)   return `${days} day${days !== 1 ? "s" : ""} ago`
  return new Date(iso).toLocaleDateString("en-CH", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const supabase = createClient()

  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [items, setItems]         = useState<Notification[]>([])
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError("Unable to load your session. Please sign in again.")
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError("Failed to load notifications.")
      setLoading(false)
      return
    }

    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const markRead = async (id: string) => {
    setMarkingId(id)

    // Optimistic update
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)

    setMarkingId(null)
  }

  const markAllRead = async () => {
    setMarkingAll(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setMarkingAll(false); return }

    // Optimistic update
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    setMarkingAll(false)
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const unreadCount = items.filter((n) => !n.is_read).length

  // -------------------------------------------------------------------------
  // Loading / error
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchData}>Try Again</Button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="gap-2"
            disabled={markingAll}
            onClick={markAllRead}
          >
            {markingAll
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Check className="h-4 w-4" />}
            Mark All Read
          </Button>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground">
            You'll be notified here about transfers, KYC updates, security alerts, and more.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((notification) => {
            const Icon = iconMap[notification.type] ?? Bell
            const isMarkingThis = markingId === notification.id

            return (
              <Card
                key={notification.id}
                className={`border-border transition-colors ${
                  !notification.is_read
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : ""
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      !notification.is_read
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isMarkingThis}
                          onClick={() => markRead(notification.id)}
                          className="shrink-0 text-xs"
                        >
                          {isMarkingThis
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : "Mark Read"}
                        </Button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}