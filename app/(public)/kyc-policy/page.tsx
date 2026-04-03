export default function KycPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">KYC Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Know Your Customer Policy - Last updated: February 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Verification Requirements</h2>
          <p>All clients must complete identity verification before accessing banking services. Required documents include a government-issued photo ID (passport preferred), proof of residential address (within 3 months), and source of funds documentation.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Tiered Verification</h2>
          <p>Tier 1 requires basic identification. Tier 2 requires enhanced due diligence including proof of income and additional identity verification. Tier 3 requires comprehensive documentation including corporate structures, ultimate beneficial ownership, and in-person or video verification.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Ongoing Due Diligence</h2>
          <p>Client profiles are reviewed periodically based on risk assessment. High-risk clients undergo enhanced ongoing monitoring. We reserve the right to request updated documentation at any time to maintain regulatory compliance.</p>
        </section>
      </div>
    </div>
  )
}
