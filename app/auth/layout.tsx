import Link from "next/link"
import { Shield } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="hidden flex-col justify-between bg-primary p-10 lg:flex lg:w-1/2">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary-foreground" />
          <span className="font-serif text-xl font-bold text-primary-foreground">
            Crestmont Bank
          </span>
        </Link>
        <div>
          <blockquote className="font-serif text-2xl font-medium leading-relaxed text-primary-foreground/90">
            {'"Banking without borders. Wealth without limits."'}
          </blockquote>
          <p className="mt-4 text-sm text-primary-foreground/60">
            Swiss-grade offshore banking for global citizens
          </p>
        </div>
        <p className="text-xs text-primary-foreground/40">
          {"2026 Crestmont Bank AG. Simulated platform."}
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8 lg:px-16">
        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-serif text-lg font-bold text-foreground">
              Crestmont Bank
            </span>
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
