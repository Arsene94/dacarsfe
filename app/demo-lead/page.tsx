import ClientLeadButton from "./client-lead-button";

export default function DemoLeadPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-berkeley">Demo Lead Meta Pixel + Conversions API</h1>
        <p className="text-sm text-gray-600">
          Completează formularul pentru a trimite un eveniment Lead atât prin Meta Pixel, cât și prin Conversions API cu deduplicare.
        </p>
      </header>
      <ClientLeadButton />
    </section>
  );
}
