"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      router.push("/auth/login")
    }, 800)
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-foreground">
        Create New Password
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New Password</Label>
          <Input id="password" type="password" placeholder="Enter new password" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm Password</Label>
          <Input id="confirm" type="password" placeholder="Confirm new password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  )
}
