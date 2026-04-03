"use client"

import { useState, useEffect } from "react"
import {
  Search,
  MoreHorizontal,
  UserCheck,
  Ban,
  ArrowUp,
  Loader2,
  Bell,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  tier: number
  account_status: string
  kyc_status: string
  country: string | null
}

type UserWithBalance = Profile & { balance: number }

type NotifType = "transfer" | "kyc" | "security" | "fx" | "statement" | "general"

const notifTypeOptions: { value: NotifType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "transfer", label: "Transfer" },
  { value: "kyc", label: "KYC" },
  { value: "security", label: "Security" },
  { value: "fx", label: "FX / Exchange" },
  { value: "statement", label: "Statement" },
]

// ---------------------------------------------------------------------------
// Send Notification Modal
// ---------------------------------------------------------------------------

interface SendNotifModalProps {
  open: boolean
  user: UserWithBalance | null
  onClose: () => void
}

function SendNotifModal({ open, user, onClose }: SendNotifModalProps) {
  const supabase = createClient()

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState<NotifType>("general")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function reset() {
    setTitle("")
    setMessage("")
    setType("general")
    setError(null)
    setSuccess(false)
  }

  async function handleSend() {
    if (!user) return
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.")
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: title.trim(),
      message: message.trim(),
      type,
    })

    if (notifErr) {
      setError(`Failed to send notification: ${notifErr.message}`)
      setSubmitting(false)
      return
    }

    // Audit log
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminUser!.id)
      .single()

    await supabase.from("audit_logs").insert({
      action: `Manual notification sent: "${title.trim()}"`,
      target_user_id: user.id,
      target_user_name:
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "Unknown",
      admin_name:
        [adminProfile?.first_name, adminProfile?.last_name]
          .filter(Boolean)
          .join(" ") || "Admin",
      log_type: "system",
    })

    setSubmitting(false)
    setSuccess(true)

    // Auto-close after brief success state
    setTimeout(() => {
      reset()
      onClose()
    }, 1200)
  }

  const userName =
    user
      ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "this user"
      : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Send Notification
          </DialogTitle>
          {user && (
            <p className="text-xs text-muted-foreground">
              To:{" "}
              <span className="font-medium text-foreground">{userName}</span>
              {user.email && (
                <span className="ml-1 text-muted-foreground">
                  · {user.email}
                </span>
              )}
            </p>
          )}
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-foreground">
              Notification sent successfully
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as NotifType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {notifTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Important Account Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-right text-xs text-muted-foreground">
                {title.length}/100
              </p>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Write your message to the customer..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-right text-xs text-muted-foreground">
                {message.length}/500
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={submitting || !title.trim() || !message.trim()}
              className="gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Sending…" : "Send Notification"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [notifTarget, setNotifTarget] = useState<UserWithBalance | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email, tier, account_status, kyc_status, country"
      )
      .order("created_at", { ascending: false })

    if (error || !profiles) {
      console.error(error)
      setLoading(false)
      return
    }

    const { data: accounts } = await supabase
      .from("accounts")
      .select("user_id, balance")

    const balanceMap: Record<string, number> = {}
    for (const acc of accounts ?? []) {
      balanceMap[acc.user_id] = (balanceMap[acc.user_id] ?? 0) + acc.balance
    }

    setUsers(
      profiles.map((p) => ({
        ...p,
        balance: balanceMap[p.id] ?? 0,
      }))
    )
    setLoading(false)
  }

  async function approveKyc(userId: string) {
    await supabase
      .from("profiles")
      .update({ kyc_status: "approved" })
      .eq("id", userId)

    await supabase.from("audit_logs").insert({
      action: "KYC approved",
      target_user_id: userId,
      log_type: "kyc",
    })

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, kyc_status: "approved" } : u))
    )
  }

  async function upgradeTier(userId: string, currentTier: number) {
    if (currentTier >= 3) return
    const newTier = currentTier + 1

    await supabase
      .from("profiles")
      .update({ tier: newTier })
      .eq("id", userId)

    await supabase.from("audit_logs").insert({
      action: `Tier upgraded to ${newTier}`,
      target_user_id: userId,
      log_type: "tier",
    })

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
    )
  }

  async function freezeAccount(userId: string) {
    await supabase
      .from("profiles")
      .update({ account_status: "frozen" })
      .eq("id", userId)

    await supabase.from("audit_logs").insert({
      action: "Account frozen",
      target_user_id: userId,
      log_type: "account",
    })

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, account_status: "frozen" } : u
      )
    )
  }

  const filtered = users.filter((u) => {
    const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase()
    const q = search.toLowerCase()
    return (
      name.includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage all platform users
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email or ID..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">User</th>
                    <th className="p-4 font-medium">Tier</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">KYC</th>
                    <th className="p-4 font-medium">Balance</th>
                    <th className="p-4 font-medium">Country</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {[user.first_name, user.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">Tier {user.tier}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            user.account_status === "active"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {user.account_status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            user.kyc_status === "approved"
                              ? "bg-success text-success-foreground"
                              : user.kyc_status === "pending"
                              ? "bg-warning text-warning-foreground"
                              : "bg-destructive text-destructive-foreground"
                          }
                        >
                          {user.kyc_status}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-foreground">
                        ${user.balance.toLocaleString()}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {user.country ?? "—"}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              disabled={user.kyc_status === "approved"}
                              onSelect={() => approveKyc(user.id)}
                            >
                              <UserCheck className="h-4 w-4" />
                              Approve KYC
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2"
                              disabled={user.tier >= 3}
                              onSelect={() => upgradeTier(user.id, user.tier)}
                            >
                              <ArrowUp className="h-4 w-4" />
                              Upgrade Tier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-destructive"
                              disabled={user.account_status === "frozen"}
                              onSelect={() => freezeAccount(user.id)}
                            >
                              <Ban className="h-4 w-4" />
                              Freeze Account
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() => setNotifTarget(user)}
                            >
                              <Bell className="h-4 w-4" />
                              Send Notification
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <SendNotifModal
        open={!!notifTarget}
        user={notifTarget}
        onClose={() => setNotifTarget(null)}
      />
    </div>
  )
}