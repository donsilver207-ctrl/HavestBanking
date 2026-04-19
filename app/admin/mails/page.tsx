"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// ─── Supabase client ──────────────────────────────────────────────────────────
import { createBrowserClient } from "@supabase/ssr"
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ────────────────────────────────────────────────────────────────────
type Attachment = { name: string; size: string }

type Email = {
  id: string
  direction: "sent" | "received" | "draft"
  from_address: string
  to_address: string
  subject: string | null
  body_text: string | null
  preview: string | null
  read: boolean
  starred: boolean
  attachments: Attachment[]
  created_at: string
}

type Folder = "inbox" | "sent" | "drafts"

const DIRECTION: Record<Folder, string> = {
  inbox:  "received",
  sent:   "sent",
  drafts: "draft",
}

// Replace with whoever is logged-in in your app
const MY_ADDRESS = "admin@vault.com"

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d={d} />
    </svg>
  )
}

const IC = {
  Inbox:   "M22 12h-6l-2 3h-4l-2-3H2",
  Send:    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  Draft:   "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  Compose: "M12 5v14M5 12h14",
  Attach:  "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
  Delete:  "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  Reply:   "M9 17H5a2 2 0 0 0-2 2M5 17V9a2 2 0 0 0 2-2h10a2 2 0 0 0 2 2v8M9 17l3 3 3-3",
  Star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  Back:    "M19 12H5M12 19l-7-7 7-7",
  X:       "M18 6L6 18M6 6l12 12",
  Refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  Spinner: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  Empty:   "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const d   = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({
  onClose, onSent, onDrafted, replyTo, editDraft,
}: {
  onClose:    () => void
  onSent:     (e: Email) => void
  onDrafted:  (e: Email) => void
  replyTo?:   Email | null
  editDraft?: Email | null
}) {
  const base = editDraft ?? null

  const [to,      setTo]      = useState(replyTo?.from_address ?? base?.to_address ?? "")
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject ?? ""}` : base?.subject ?? "")
  const [body,    setBody]    = useState(base?.body_text ?? "")
  const [files,   setFiles]   = useState<Attachment[]>(base?.attachments ?? [])
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  // Stable draft ID so repeated saves upsert correctly
  const draftId = useRef<string>(base?.id ?? crypto.randomUUID())

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024
        ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(f.size / 1024)} KB`,
    }))
    setFiles(prev => [...prev, ...picked])
  }

  // Shared upsert logic
  const upsert = async (direction: "sent" | "draft") => {
    const payload = {
      id:           draftId.current,
      direction,
      from_address: MY_ADDRESS,
      to_address:   to,
      subject,
      body_text:    body,
      read:         true,
      starred:      false,
      attachments:  files,
    }

    const { data, error } = await supabase
      .from("emails")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Email
  }

  const handleSend = async () => {
    if (!to || !subject) return
    setBusy(true); setError(null)
    try {
      // If editing a draft, delete the draft row first
      if (base) await supabase.from("emails").delete().eq("id", base.id)
      // Insert as sent (new uuid)
      const { data, error } = await supabase
        .from("emails")
        .insert({
          direction:    "sent",
          from_address: MY_ADDRESS,
          to_address:   to,
          subject,
          body_text:    body,
          read:         true,
          starred:      false,
          attachments:  files,
        })
        .select()
        .single()
      if (error) throw new Error(error.message)
      onSent(data as Email)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
    const { data: { session } } = await supabase.auth.getSession()
console.log("role:", session?.user?.role)
console.log("jwt:", session?.access_token)
  }

  const handleSaveDraft = async () => {
    setBusy(true); setError(null)
    try {
      const data = await upsert("draft")
      onDrafted(data)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end p-6 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-serif font-bold text-base text-foreground">
            {replyTo ? "Reply" : base ? "Edit Draft" : "New Message"}
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleSaveDraft} disabled={busy}>
              Save Draft
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <Icon d={IC.X} />
            </button>
          </div>
        </div>

        {/* To / Subject */}
        <div className="flex flex-col px-5 pt-4 border-b border-border pb-4 gap-0">
          <div className="flex items-center gap-3 py-2 border-b border-border/50">
            <Label className="text-xs text-muted-foreground w-14 shrink-0">To</Label>
            <Input value={to} onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="border-0 shadow-none p-0 h-auto focus-visible:ring-0 text-sm bg-transparent" />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Label className="text-xs text-muted-foreground w-14 shrink-0">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="border-0 shadow-none p-0 h-auto focus-visible:ring-0 text-sm bg-transparent" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Write your message here…"
            className="border-0 shadow-none resize-none focus-visible:ring-0 text-sm min-h-[180px] p-0 bg-transparent" />
        </div>

        {/* Attachment chips */}
        {files.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs">
                <Icon d={IC.Attach} size={12} className="text-muted-foreground" />
                <span className="font-medium text-foreground">{f.name}</span>
                <span className="text-muted-foreground">{f.size}</span>
                <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive ml-1">
                  <Icon d={IC.X} size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="px-5 pb-2 text-xs text-destructive">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Icon d={IC.Attach} size={14} />
            Attach file
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />

          <Button size="sm" onClick={handleSend} disabled={!to || !subject || busy} className="gap-2">
            {busy
              ? <><Icon d={IC.Spinner} size={13} className="animate-spin" /> Sending…</>
              : <><Icon d={IC.Send}    size={13} /> Send</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Email Detail ─────────────────────────────────────────────────────────────
function EmailDetail({
  email, onClose, onDelete, onReply, onEditDraft,
}: {
  email:       Email
  onClose:     () => void
  onDelete:    (id: string) => void
  onReply:     (e: Email) => void
  onEditDraft: (e: Email) => void
}) {
  const isDraft = email.direction === "draft"

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <Icon d={IC.Back} />
        </button>
        <span className="text-xs text-muted-foreground">{formatFull(email.created_at)}</span>

        <div className="ml-auto flex gap-2">
          {isDraft ? (
            <Button size="sm" variant="outline" className="text-xs gap-1.5"
              onClick={() => onEditDraft(email)}>
              Edit Draft
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="text-xs gap-1.5"
              onClick={() => onReply(email)}>
              <Icon d={IC.Reply} size={13} /> Reply
            </Button>
          )}
          <Button size="sm" variant="outline"
            className="text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => { onDelete(email.id); onClose() }}>
            <Icon d={IC.Delete} size={13} /> Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <h2 className="font-serif text-xl font-bold text-foreground mb-4">
          {email.subject ?? "(no subject)"}
          {isDraft && <Badge variant="outline" className="ml-3 text-xs align-middle">Draft</Badge>}
        </h2>

        <div className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {email.from_address.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{email.from_address}</p>
            <p className="text-xs text-muted-foreground">To: {email.to_address}</p>
          </div>
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {email.body_text ?? "(empty)"}
        </p>

        {email.attachments?.length > 0 && (
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Attachments ({email.attachments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((a, i) => (
                <div key={i}
                  className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 text-xs hover:bg-muted/80 transition-colors cursor-pointer">
                  <Icon d={IC.Attach} size={13} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">{a.name}</span>
                  <span className="text-muted-foreground">{a.size}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Email Row ────────────────────────────────────────────────────────────────
function EmailRow({
  email, folder, onClick, onDelete, onToggleStar,
}: {
  email:        Email
  folder:       Folder
  onClick:      () => void
  onDelete:     (id: string) => void
  onToggleStar: (id: string, starred: boolean) => void
}) {
  const label = folder === "sent" || folder === "drafts"
    ? email.to_address
    : email.from_address

  return (
    <tr onClick={onClick}
      className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40 group">

      {/* Star */}
      <td className="px-4 py-3 w-8">
        <button onClick={e => { e.stopPropagation(); onToggleStar(email.id, email.starred) }}
          className={`transition-colors ${email.starred ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400"}`}>
          <Icon d={IC.Star} size={14} />
        </button>
      </td>

      {/* Unread dot */}
      <td className="px-2 py-3 w-6">
        {!email.read && <span className="block w-2 h-2 rounded-full bg-primary" />}
      </td>

      {/* From / To */}
      <td className="px-2 py-3 w-40">
        <span className={`text-sm block truncate ${!email.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
          {label}
        </span>
      </td>

      {/* Subject + preview */}
      <td className="px-2 py-3 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`text-sm shrink-0 ${!email.read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
            {email.subject ?? "(no subject)"}
          </span>
          {email.preview && (
            <span className="text-xs text-muted-foreground truncate hidden sm:block">
              — {email.preview}
            </span>
          )}
        </div>
        {(email.attachments?.length ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Icon d={IC.Attach} size={11} />
            {email.attachments.length} attachment{email.attachments.length !== 1 ? "s" : ""}
          </span>
        )}
      </td>

      {/* Date / delete */}
      <td className="px-4 py-3 text-right whitespace-nowrap w-24">
        <span className="text-xs text-muted-foreground group-hover:hidden">
          {formatDate(email.created_at)}
        </span>
        <button onClick={e => { e.stopPropagation(); onDelete(email.id) }}
          className="hidden group-hover:inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors">
          <Icon d={IC.Delete} size={13} /> Delete
        </button>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminEmailPage() {
  const [folder,   setFolder]   = useState<Folder>("inbox")
  const [emails,   setEmails]   = useState<Email[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [selected, setSelected] = useState<Email | null>(null)

  const [composing,  setComposing]  = useState(false)
  const [replyTo,    setReplyTo]    = useState<Email | null>(null)
  const [editDraft,  setEditDraft]  = useState<Email | null>(null)

  // Sidebar badge counts (always fresh)
  const [unreadCount, setUnreadCount] = useState(0)
  const [draftCount,  setDraftCount]  = useState(0)

  // ── Fetch current folder ────────────────────────────────────────────────
  const fetchEmails = useCallback(async (f: Folder) => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .eq("direction", DIRECTION[f])
      .order("created_at", { ascending: false })

    if (error) setError(error.message)
    else       setEmails(data as Email[])
    setLoading(false)
  }, [])

  // ── Fetch sidebar badge counts ──────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    const [{ count: unread }, { count: drafts }] = await Promise.all([
      supabase.from("emails").select("*", { count: "exact", head: true })
        .eq("direction", "received").eq("read", false),
      supabase.from("emails").select("*", { count: "exact", head: true })
        .eq("direction", "draft"),
    ])
    setUnreadCount(unread ?? 0)
    setDraftCount(drafts  ?? 0)
  }, [])

  useEffect(() => { fetchEmails(folder) }, [folder, fetchEmails])
  useEffect(() => { fetchCounts() },       [fetchCounts])

  // ── Open email (mark read) ──────────────────────────────────────────────
  const handleOpen = async (email: Email) => {
    setSelected(email)
    if (!email.read && email.direction === "received") {
      // Optimistic
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e))
      setUnreadCount(c => Math.max(0, c - 1))
      await supabase.from("emails").update({ read: true }).eq("id", email.id)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const removed = emails.find(e => e.id === id)
    // Optimistic
    setEmails(prev => prev.filter(e => e.id !== id))
    if (removed?.direction === "received" && !removed.read)
      setUnreadCount(c => Math.max(0, c - 1))
    if (removed?.direction === "draft")
      setDraftCount(c => Math.max(0, c - 1))

    await supabase.from("emails").delete().eq("id", id)
  }

  // ── Star toggle ─────────────────────────────────────────────────────────
  const handleToggleStar = async (id: string, current: boolean) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !current } : e))
    if (selected?.id === id) setSelected(s => s ? { ...s, starred: !current } : s)
    await supabase.from("emails").update({ starred: !current }).eq("id", id)
  }

  // ── After send ──────────────────────────────────────────────────────────
  const handleSent = (email: Email) => {
    if (folder === "sent") setEmails(prev => [email, ...prev])
  }

  // ── After draft save ────────────────────────────────────────────────────
  const handleDrafted = (email: Email) => {
    if (folder === "drafts") {
      setEmails(prev =>
        prev.find(e => e.id === email.id)
          ? prev.map(e => e.id === email.id ? email : e)
          : [email, ...prev]
      )
    }
    fetchCounts()
  }

  const openCompose  = () => { setReplyTo(null); setEditDraft(null); setComposing(true) }
  const openReply    = (e: Email) => { setReplyTo(e); setEditDraft(null); setComposing(true) }
  const openEdit     = (e: Email) => { setEditDraft(e); setReplyTo(null); setComposing(true) }
  const closeCompose = () => { setComposing(false); setReplyTo(null); setEditDraft(null) }

  const changeFolder = (f: Folder) => { setFolder(f); setSelected(null) }

  // ── Sidebar config ──────────────────────────────────────────────────────
  const folders: { key: Folder; label: string; icon: string; count?: number }[] = [
    { key: "inbox",  label: "Inbox",  icon: IC.Empty,  count: unreadCount },
    { key: "sent",   label: "Sent",   icon: IC.Send },
    { key: "drafts", label: "Drafts", icon: IC.Draft,   count: draftCount  },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Internal and external correspondence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchEmails(folder)} className="gap-1.5">
            <Icon d={IC.Refresh} size={13} /> Refresh
          </Button>
          <Button onClick={openCompose} className="gap-2">
            <Icon d={IC.Compose} size={14} /> Compose
          </Button>
        </div>
      </div>

      <div className="flex gap-4 min-h-[600px]">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 flex flex-col gap-1">
          {folders.map(f => (
            <button key={f.key} onClick={() => changeFolder(f.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full
                ${folder === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon d={f.icon} size={15} />
              <span className="flex-1">{f.label}</span>
              {(f.count ?? 0) > 0 && (
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  folder === f.key
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
                }`}>
                  {f.count}
                </Badge>
              )}
            </button>
          ))}
        </nav>

        {/* Main panel */}
        <Card className="border-border flex-1 overflow-hidden flex flex-col">
          {selected ? (
            <EmailDetail
              email={selected}
              onClose={() => setSelected(null)}
              onDelete={handleDelete}
              onReply={openReply}
              onEditDraft={openEdit}
            />
          ) : (
            <>
              <CardHeader className="py-3 px-5 border-b border-border">
                <CardTitle className="text-sm font-semibold capitalize text-foreground">
                  {folder}
                  {!loading && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {emails.length} message{emails.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground text-sm">
                    <Icon d={IC.Spinner} size={18} className="animate-spin" /> Loading…
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchEmails(folder)}>
                      Retry
                    </Button>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                    <Icon d={IC.Empty} size={28} />
                    <p className="text-sm">No messages in {folder}</p>
                  </div>
                ) : (
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: "2rem" }} />
                      <col style={{ width: "1.5rem" }} />
                      <col style={{ width: "10rem" }} />
                      <col />
                      <col style={{ width: "6rem" }} />
                    </colgroup>
                    <tbody>
                      {emails.map(email => (
                        <EmailRow
                          key={email.id}
                          email={email}
                          folder={folder}
                          onClick={() => handleOpen(email)}
                          onDelete={handleDelete}
                          onToggleStar={handleToggleStar}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {composing && (
        <ComposeModal
          replyTo={replyTo}
          editDraft={editDraft}
          onClose={closeCompose}
          onSent={handleSent}
          onDrafted={handleDrafted}
        />
      )}
    </div>
  )
}