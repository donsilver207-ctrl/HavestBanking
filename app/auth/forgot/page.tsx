"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Reset Password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we will send you a reset link.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Check your email
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            If an account exists with that email, we have sent a password reset
            link.
          </p>
        </div>
      ) : (
        <>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="text-primary hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  )
}
