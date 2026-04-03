"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  /*async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
  
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
  
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
  
      // Check if user has 2FA enrolled — if so, they must verify it
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  
      if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
        router.push("/auth/2fa")   // needs TOTP verification
      } else {
        router.push("/dashboard")  // no 2FA, go straight in
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login")
      setLoading(false)
    }
  }*/
    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      setLoading(true)
      setError("")
    
      try {
        const supabase = createClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
    
        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }
    
        // Check 2FA first
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aalData?.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
          router.push("/auth/2fa")
          return
        }
    
        // Check if admin
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single()
    
          if (profile?.is_admin) {
            router.push("/admin")
            console.log("Redirecting to admin dashboard")
            return
          }
        }
    
        router.push("/dashboard")
      } catch (err: any) {
        setError(err.message || "An error occurred during login")
        setLoading(false)
      }
    }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Welcome Back
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to access your offshore accounts.
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <Link href="/auth/register" className="text-primary hover:underline">
          Open Account
        </Link>
      </p>
    </div>
  )
}
