"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VerifyPage() {
  const router = useRouter()
  const supabase = createClient()

  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    const stored = sessionStorage.getItem("otp_email")
    if (!stored) {
      // No email found — send back to register
      router.replace("/auth/register")
    } else {
      setEmail(stored)
    }
  }, [])

  async function handleVerify() {
    if (value.length < 6 || loading) return
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: value,
      type: "signup",
    })

    if (error) {
      setError(error.message)
      setValue("")
      setLoading(false)
    } else {
      sessionStorage.removeItem("otp_email") // clean up
      router.push("/auth/2fa_setup")
    }

    
  }

  async function handleResend() {
    if (resendCooldown > 0 || !email) return
    setError("")

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    })

    if (error) {
      setError(error.message)
      return
    }

    setResendCooldown(60)
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) clearInterval(timer)
        return s - 1
      })
    }, 1000)
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-7 w-7 text-primary" />
      </div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Verify Your Email
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {"We've sent a 6-digit verification code to "}
        <span className="font-medium text-foreground">{email || "your email"}</span>.
      </p>

      <div className="mt-8 flex justify-center">
        <InputOTP
          maxLength={8}
          value={value}
          onChange={setValue}
          pattern={REGEXP_ONLY_DIGITS}
          onComplete={handleVerify}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
            <InputOTPSlot index={6} />
            <InputOTPSlot index={7} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
      )}

      <Button
        className="mt-6 w-full"
        onClick={handleVerify}
        disabled={value.length < 6 || loading}
      >
        {loading ? "Verifying…" : "Verify Email"}
      </Button>

      <p className="mt-4 text-sm text-muted-foreground">
        {"Didn't receive the code? "}
        <button
          className="text-primary hover:underline disabled:opacity-50"
          onClick={handleResend}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
        </button>
      </p>
    </div>
  )
}