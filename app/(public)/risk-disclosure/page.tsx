export default function RiskDisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
      <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">Risk Disclosure</h1>
      <p className="mt-4 text-sm text-muted-foreground">Last updated: February 2026</p>
      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Currency Risk</h2>
          <p>Holding assets in foreign currencies involves exchange rate risk. The value of your holdings may increase or decrease due to currency fluctuations. Past performance is not indicative of future results.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Regulatory Risk</h2>
          <p>Offshore banking is subject to evolving international regulations. Changes in tax laws, reporting requirements, or sanctions may affect your ability to hold or transfer funds. Clients are responsible for compliance with their home country tax obligations.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Operational Risk</h2>
          <p>While we employ institutional-grade security, no system is entirely immune to operational disruptions. Service interruptions, technical failures, or cyber incidents may temporarily affect access to your accounts.</p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Simulation Notice</h2>
          <p>This is a demonstration platform. No real banking services are provided. All data, balances, and transactions shown are simulated for illustrative purposes only. Do not deposit real funds or rely on this platform for actual financial services.</p>
        </section>
      </div>
    </div>
  )
}
