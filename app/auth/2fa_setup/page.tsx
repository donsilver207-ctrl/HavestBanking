"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Fingerprint } from "lucide-react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

export default function TwoFactorSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [enrolling, setEnrolling] = useState(true)
  const [error, setError] = useState("")

  // Enroll state
  const [qrCode, setQrCode] = useState("")       // SVG data URI from Supabase
  const [secret, setSecret] = useState("")        // manual entry fallback
  const [factorId, setFactorId] = useState("")    // needed to verify
  const [userId, setUserId] = useState("")       // 👈 stored here, used in handleVerify
 
  useEffect(() => {
    async function enroll() {
      const { data: { user } } = await supabase.auth.getUser()
  
      if (!user) {
        router.replace("/auth/login")
        return
      }
      setUserId(user.id)
      const { data: listData, error: listError } = await supabase.auth.mfa.listFactors()
  
      if (listError) {
        setError(listError.message)
        setEnrolling(false)
        return
      }
  
      const existingTotp = listData.totp?.[0]
  
      if (existingTotp) {
        if (existingTotp.status === "verified") {
          router.replace("/dashboard")
          return
        }
        await supabase.auth.mfa.unenroll({ factorId: existingTotp.id })
      }
  
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "totp_"+user.email!, // 👈 unique per account
      })
  
      if (error) {
        setError(error.message)
      } else {
        setQrCode(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
      }
  
      setEnrolling(false)
    }
  
    enroll()
  }, [])
  async function handleVerify() {
    if (value.length < 6 || loading) return
    setLoading(true)
    setError("")

    // Step 1: create a challenge for this factor
    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId })

    if (challengeError) {
      setError(challengeError.message)
      setLoading(false)
      return
    }

    // Step 2: verify the TOTP code against the challenge
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
      await supabase
        .from("profiles")
        .update({ two_factor_enabled: true })
        .eq("id", userId)
      router.push("/dashboard")
    }

    //setLoading(false)
  }

  if (enrolling) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Setting up authenticator…</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Fingerprint className="h-7 w-7 text-primary" />
      </div>

      <h1 className="font-serif text-2xl font-bold text-foreground">
        Set Up Authenticator
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Scan the QR code with Google Authenticator, Authy, or any TOTP app.
      </p>

      {/* QR Code */}
      {qrCode && (
        <div className="mt-6 flex justify-center">
          <div className="rounded-xl border bg-white p-3 shadow-sm">
          <img
            src={qrCode}
            alt="Authenticator QR code"
            width={160}
            height={160}
            className="block"
          />
          </div>
        </div>
      )}

      {/* Manual secret fallback */}
      {secret && (
        <details className="mt-3 text-left">
          <summary className="cursor-pointer text-center text-xs text-muted-foreground hover:text-foreground">
            Can't scan? Enter code manually
          </summary>
          <div className="mt-2 rounded-lg border bg-muted/50 px-4 py-2 text-center">
            <p className="font-mono text-sm tracking-widest text-foreground break-all">
              {secret}
            </p>
          </div>
        </details>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        After scanning, enter the 6-digit code shown in your app to confirm setup.
      </p>

      {/* OTP input */}
      <div className="mt-4 flex justify-center">
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
        {loading ? "Verifying…" : "Confirm & Enable 2FA"}
      </Button>

      <p className="mt-4 text-sm text-muted-foreground">
        {"Want to skip this for now? "}
        <button
          className="text-primary hover:underline"
          onClick={() => router.push("/dashboard")}
        >
          Set up later
        </button>
      </p>
    </div>
  )
}