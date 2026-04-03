"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [country, setCountry] = useState("")
  const [nationalId, setNationalId] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          // Passed into new.raw_user_meta_data — picked up by the DB trigger
          data: {
            country: country || "CH",
            national_id: nationalId || null,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Trigger has already seeded: profiles, accounts, wallets, fx_rates, notifications
      sessionStorage.setItem("otp_email", email)
      router.push("/auth/verify")
    } catch (err: any) {
      setError(err.message || "An error occurred during registration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Open Account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your offshore banking account in minutes.
      </p>

      {error && (
        <div className="mt-4 flex gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">Country of Residence</Label>
          <Select value={country} onValueChange={setCountry} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ch">Switzerland</SelectItem>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
              <SelectItem value="sg">Singapore</SelectItem>
              <SelectItem value="ae">United Arab Emirates</SelectItem>
              <SelectItem value="hk">Hong Kong</SelectItem>
              <SelectItem value="jp">Japan</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationalId">National ID (Optional)</Label>
          <Input
            id="nationalId"
            placeholder="SSN / Passport / NIN"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Providing your ID now speeds up Tier 2 verification.
          </p>
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  )
}