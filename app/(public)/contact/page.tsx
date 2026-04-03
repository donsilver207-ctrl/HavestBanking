"use client"

import { useState } from "react"
import { MapPin, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

const offices = [
  { city: "Zurich", address: "Bahnhofstrasse 45, 8001 Zurich, Switzerland", phone: "+41 44 000 0000" },
  { city: "Grand Cayman", address: "George Town, P.O. Box 309, Grand Cayman, KY1-1104", phone: "+1 345 000 0000" },
  { city: "Singapore", address: "1 Raffles Place, Tower 2, Singapore 048616", phone: "+65 6000 0000" },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

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
            {submitted ? (
              <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center">
                <p className="text-lg font-semibold text-foreground">
                  Message Sent Successfully
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Our team will respond within 24 business hours.
                </p>
              </div>
            ) : (
              <form
                className="mt-6 flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" required />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Account inquiry" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="How can we help you?" rows={5} required />
                </div>
                <Button type="submit" size="lg">
                  Send Message
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
                support@helveticabank.ch
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
