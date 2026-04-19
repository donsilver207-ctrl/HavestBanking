export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">Last updated: February 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>By accessing or using Crestmont Bank services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and Crestmont Bank AG.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. Account Eligibility</h2>
          <p>To open an account, you must be at least 18 years of age, provide valid identification documentation, and comply with all applicable KYC (Know Your Customer) requirements. Crestmont Bank reserves the right to refuse service to any applicant at its sole discretion.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Account Tiers & Services</h2>
          <p>Services are provided according to your account tier. Balance caps, transfer limits, and available features vary by tier. Tier upgrades require additional verification. Crestmont Bank may modify tier features and pricing with 30 days notice.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Fees & Charges</h2>
          <p>All applicable fees are disclosed in our pricing schedule. Fees may include but are not limited to: account maintenance fees, SWIFT transfer fees, FX conversion margins, and card issuance fees. Fee changes will be communicated 30 days in advance.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>This is a simulated banking platform for demonstration purposes. No real financial transactions are processed. Crestmont Bank AG (simulated) is not liable for any decisions made based on this demonstration.</p>
        </section>
      </div>
    </div>
  )
}
