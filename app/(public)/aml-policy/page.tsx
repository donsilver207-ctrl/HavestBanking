export default function AmlPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">AML Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">Anti-Money Laundering Policy - Last updated: February 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Commitment</h2>
          <p>Helvetica Bank is committed to the highest standards of Anti-Money Laundering (AML) compliance. We actively monitor, detect, and report suspicious activities in accordance with international regulations and FATF recommendations.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Transaction Monitoring</h2>
          <p>All transactions are screened in real-time against global sanctions lists (OFAC, EU, UN), PEP databases, and adverse media sources. Automated algorithms flag unusual patterns for manual review by our compliance team.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Reporting</h2>
          <p>Suspicious Activity Reports (SARs) are filed with the relevant Financial Intelligence Unit (FIU) as required by law. We maintain comprehensive records of all transactions and compliance activities for a minimum of 10 years.</p>
        </section>
      </div>
    </div>
  )
}
