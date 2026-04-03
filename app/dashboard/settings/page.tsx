"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
}

interface PreferencesForm {
  default_currency: string
  language: string
  timezone: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUNTRIES = [
  { code: "CH", label: "Switzerland" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "OTHER", label: "Other" },
]

const CURRENCIES = [
  { code: "CHF", label: "CHF - Swiss Franc" },
  { code: "USD", label: "USD - US Dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British Pound" },
  { code: "SGD", label: "SGD - Singapore Dollar" },
  { code: "AED", label: "AED - UAE Dirham" },
]

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
]

const TIMEZONES = [
  { code: "CET", label: "CET (Zurich)" },
  { code: "GMT", label: "GMT (London)" },
  { code: "EST", label: "EST (New York)" },
  { code: "SGT", label: "SGT (Singapore)" },
  { code: "GST", label: "GST (Dubai)" },
  { code: "WAT", label: "WAT (Lagos)" },
]

// ---------------------------------------------------------------------------
// Save feedback banner
// ---------------------------------------------------------------------------

function SaveBanner({
  status,
  errorMsg,
}: {
  status: "success" | "error" | null
  errorMsg?: string | null
}) {
  if (!status) return null
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium ${
        status === "success"
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {status === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {status === "success"
        ? "Changes saved successfully."
        : (errorMsg ?? "Failed to save changes.")}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Form state
  const [profile, setProfile] = useState<ProfileForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "CH",
  })
  const [prefs, setPrefs] = useState<PreferencesForm>({
    default_currency: "CHF",
    language: "en",
    timezone: "CET",
  })
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // Password fields
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Per-section save/busy state
  const [profileStatus, setProfileStatus]       = useState<"success" | "error" | null>(null)
  const [prefsStatus, setPrefsStatus]           = useState<"success" | "error" | null>(null)
  const [passwordStatus, setPasswordStatus]     = useState<"success" | "error" | null>(null)
  const [passwordErrMsg, setPasswordErrMsg]     = useState<string | null>(null)
  const [savingProfile, setSavingProfile]       = useState(false)
  const [savingPrefs, setSavingPrefs]           = useState(false)
  const [savingPassword, setSavingPassword]     = useState(false)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setFetchError("Unable to load your session. Please sign in again.")
      setLoading(false)
      return
    }

    const { data: pd, error: profileError } = await supabase
      .from("profiles")
      .select(
        "first_name, last_name, email, phone, country, default_currency, language, timezone, two_factor_enabled"
      )
      .eq("id", user.id)
      .single()

    if (profileError) {
      setFetchError("Failed to load profile data.")
      setLoading(false)
      return
    }

    setProfile({
      first_name: pd.first_name ?? "",
      last_name:  pd.last_name  ?? "",
      email:      pd.email      ?? user.email ?? "",
      phone:      pd.phone      ?? "",
      country:    pd.country    ?? "CH",
    })

    setPrefs({
      default_currency: pd.default_currency ?? "CHF",
      language:         pd.language         ?? "en",
      timezone:         pd.timezone         ?? "CET",
    })

    setTwoFactorEnabled(pd.two_factor_enabled ?? false)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // -------------------------------------------------------------------------
  // Flash helper
  // -------------------------------------------------------------------------

  const flash = (
    setter: (v: "success" | "error" | null) => void,
    value: "success" | "error"
  ) => {
    setter(value)
    setTimeout(() => setter(null), 3500)
  }

  // -------------------------------------------------------------------------
  // Save profile tab
  // -------------------------------------------------------------------------

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileStatus(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      flash(setProfileStatus, "error")
      setSavingProfile(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name:  profile.first_name.trim(),
        last_name:   profile.last_name.trim(),
        phone:       profile.phone.trim(),
        country:     profile.country,
        updated_at:  new Date().toISOString(),
      })
      .eq("id", user.id)

    flash(setProfileStatus, error ? "error" : "success")
    setSavingProfile(false)
  }

  // -------------------------------------------------------------------------
  // Save preferences tab
  // -------------------------------------------------------------------------

  const handleSavePrefs = async () => {
    setSavingPrefs(true)
    setPrefsStatus(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      flash(setPrefsStatus, "error")
      setSavingPrefs(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        default_currency: prefs.default_currency,
        language:         prefs.language,
        timezone:         prefs.timezone,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", user.id)

    flash(setPrefsStatus, error ? "error" : "success")
    setSavingPrefs(false)
  }

  // -------------------------------------------------------------------------
  // Toggle 2FA — persists to profiles.two_factor_enabled
  // -------------------------------------------------------------------------

  const handleToggle2FA = async (enabled: boolean) => {
    setTwoFactorEnabled(enabled) // optimistic

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("profiles")
      .update({
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
  }

  // -------------------------------------------------------------------------
  // Change password — via Supabase Auth
  // -------------------------------------------------------------------------

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordStatus(null)
    setPasswordErrMsg(null)

    if (newPassword !== confirmPassword) {
      setPasswordErrMsg("New passwords do not match.")
      flash(setPasswordStatus, "error")
      return
    }
    if (newPassword.length < 8) {
      setPasswordErrMsg("Password must be at least 8 characters.")
      flash(setPasswordStatus, "error")
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordErrMsg(error.message)
      flash(setPasswordStatus, "error")
    } else {
      setNewPassword("")
      setConfirmPassword("")
      flash(setPasswordStatus, "success")
    }

    setSavingPassword(false)
  }

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Button variant="outline" onClick={fetchData}>
          Try Again
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences and security
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* ── PROFILE ── */}
        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <SaveBanner status={profileStatus} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>First Name</Label>
                    <Input
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, first_name: e.target.value }))
                      }
                      placeholder="Jean"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Last Name</Label>
                    <Input
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, last_name: e.target.value }))
                      }
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                {/* Email is auth-managed — read only */}
                <div className="flex flex-col gap-1.5">
                  <Label>
                    Email Address{" "}
                    <span className="text-xs text-muted-foreground">
                      (linked to your account)
                    </span>
                  </Label>
                  <Input
                    type="email"
                    value={profile.email}
                    readOnly
                    disabled
                    className="cursor-not-allowed opacity-60"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Phone Number</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+41 79 123 45 67"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Country of Residence</Label>
                  <Select
                    value={profile.country}
                    onValueChange={(v) =>
                      setProfile((p) => ({ ...p, country: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="self-start gap-2"
                  disabled={savingProfile}
                  onClick={handleSaveProfile}
                >
                  {savingProfile && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {savingProfile ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECURITY ── */}
        <TabsContent value="security">
          <div className="flex flex-col gap-4">

            {/* 2FA card */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Authenticator App
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Google Authenticator or similar
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        twoFactorEnabled
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={handleToggle2FA}
                    />
                  </div>
                </div>

                {/* Email verification — always on for email-based accounts */}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Email Verification
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Backup verification via email
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-success text-success-foreground">
                    Enabled
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Change password */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleChangePassword}
                >
                  <SaveBanner
                    status={passwordStatus}
                    errorMsg={passwordErrMsg}
                  />

                  <div className="flex flex-col gap-1.5">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Confirm New Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="self-start gap-2"
                    disabled={savingPassword || !newPassword || !confirmPassword}
                  >
                    {savingPassword && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {savingPassword ? "Updating…" : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active sessions — Supabase client SDK doesn't expose a session
                list, so we surface the current session only */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Current Session
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Signed in on this device
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── ALERTS ── */}
        {/* The schema has no notification-preferences table, so these toggles
            are uncontrolled/local until a prefs column or table is added. */}
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[
                {
                  label: "Transfer alerts",
                  desc: "Notify on all inbound and outbound transfers",
                  defaultChecked: true,
                },
                {
                  label: "Security alerts",
                  desc: "New login attempts and password changes",
                  defaultChecked: true,
                },
                {
                  label: "FX rate alerts",
                  desc: "When rates cross your target thresholds",
                  defaultChecked: true,
                },
                {
                  label: "Marketing emails",
                  desc: "Product updates and new features",
                  defaultChecked: false,
                },
                {
                  label: "Monthly statements",
                  desc: "Email notification when statements are ready",
                  defaultChecked: true,
                },
                {
                  label: "Compliance updates",
                  desc: "KYC status changes and document requests",
                  defaultChecked: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.defaultChecked} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PREFERENCES ── */}
        <TabsContent value="preferences">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SaveBanner status={prefsStatus} />

              <div className="flex flex-col gap-1.5">
                <Label>Default Currency</Label>
                <Select
                  value={prefs.default_currency}
                  onValueChange={(v) =>
                    setPrefs((p) => ({ ...p, default_currency: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Language</Label>
                <Select
                  value={prefs.language}
                  onValueChange={(v) =>
                    setPrefs((p) => ({ ...p, language: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Timezone</Label>
                <Select
                  value={prefs.timezone}
                  onValueChange={(v) =>
                    setPrefs((p) => ({ ...p, timezone: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="self-start gap-2"
                disabled={savingPrefs}
                onClick={handleSavePrefs}
              >
                {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingPrefs ? "Saving…" : "Save Preferences"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}