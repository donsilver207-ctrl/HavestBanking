export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Last updated: February 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Data Collection</h2>
          <p>We collect personal identification information, financial documentation, transaction data, and device information necessary to provide secure banking services and comply with regulatory requirements.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Data Usage</h2>
          <p>Your data is used exclusively for account management, transaction processing, regulatory compliance, fraud prevention, and service improvement. We never sell personal data to third parties.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Data Protection</h2>
          <p>All personal and financial data is protected with AES-256 encryption at rest and TLS 1.3 in transit. Access is restricted to authorized personnel on a need-to-know basis with full audit logging.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Your Rights</h2>
          <p>Under applicable data protection laws, you have the right to access, rectify, delete, or port your personal data. Contact our Data Protection Officer at dpo@helveticabank.ch for any requests.</p>
        </section>
      </div>
    </div>
  )
}
