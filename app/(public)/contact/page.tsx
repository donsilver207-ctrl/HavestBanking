"use client"

import { useState } from "react"
import { MapPin, Mail, Phone, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

const offices = [
  { city: "London", address: "One Canada Square, Canary Wharf, London E14 5AB", phone: "+44 79 8859 2888" },
  { city: "Prime Tower Zurich", address: "Hardstrasse 201, 8005 Zurich, Switzerland", phone: "+44 79 8859 2888" },
  { city: "40 Wall Street",address: "40 Wall St, New York, NY 10005, USA", phone: "+1 302 404 0290" },
]

const SUPPORT_EMAIL = "support@crestmontbanking.com"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      // Send email to support
      const { error: supportEmailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: SUPPORT_EMAIL,
          subject: `[Contact Form] ${subject}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `,
        },
      })

      if (supportEmailError) throw new Error(supportEmailError.message)

      // Send confirmation email to user
      const { error: userEmailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: `We received your message — ${subject}`,
          html: `
            <h2>Hi ${firstName},</h2>
            <p>Thank you for reaching out to Crestmont Banking. We've received your message and our team will respond within 24 business hours.</p>
            <hr/>
            <p><strong>Your message:</strong></p>
            <p>${message}</p>
            <hr/>
            <p>If you have further questions, reply to this email or contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
            <p>— The Crestmont Banking Team</p>
          `,
        },
      })

      if (userEmailError) throw new Error(userEmailError.message)

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance font-serif text-4xl font-bold text-foreground md:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Reach out to our team for inquiries about account opening, private
              banking, or corporate services.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Send a Secure Message
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All communications are encrypted end-to-end.
            </p>

            {error && (
              <div className="mt-4 flex gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {submitted ? (
              <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-lg font-semibold text-foreground">
                  Message Sent Successfully
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  A confirmation has been sent to <strong>{email}</strong>. Our team will respond within 24 business hours.
                </p>
              </div>
            ) : (
              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Account inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help you?"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" size="lg" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>

          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">
              Our Offices
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {offices.map((office) => (
                <Card key={office.city} className="border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{office.city}</h3>
                    <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      {office.address}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      {office.phone}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="font-semibold text-foreground">Support Email</h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}