"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function TwoFactorPage() {
  const router = useRouter()
  const supabase = createClient()

  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [factorId, setFactorId] = useState("")

  // Get the verified TOTP factor ID on mount
  useEffect(() => {
    async function loadFactor() {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error || !data?.totp?.length) {
        router.replace("/auth/login")
        return
      }
      const verified = data.totp.find((f) => f.status === "verified")
      if (!verified) {
        router.replace("/auth/login")
        return
      }
      setFactorId(verified.id)
    }
    loadFactor()
  }, [])

  async function handleVerify() {
    if (value.length < 6 || loading) return
    setLoading(true)
    setError("")

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })

    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: value,
    })

    if (verifyError) {
      setError(verifyError.message)
      setValue("")
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>

      <h1 className="font-serif text-2xl font-bold text-foreground">
        Two-Factor Authentication
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code from your authenticator app.
      </p>

      <div className="mt-8 flex justify-center">
        <InputOTP
          maxLength={6}
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
        {loading ? "Verifying…" : "Verify"}
      </Button>
    </div>
  )
}