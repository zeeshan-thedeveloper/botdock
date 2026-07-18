const statusItems = [
  ['Repository foundation', 'Implemented'],
  ['Authentication and organisations', 'Planned'],
  ['Bot configuration playground', 'Planned'],
  ['Knowledge ingestion', 'Planned'],
  ['Streaming chat runtime', 'Planned'],
] as const;

export default function DashboardShell() {
  return (
    <main className="min-h-screen bg-[#f7faf8]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-3 border-b border-[#dbe7df] pb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-moss">BotDock</p>
          <h1 className="text-3xl font-semibold text-ink">Dashboard foundation</h1>
          <p className="max-w-3xl text-base leading-7 text-[#4b5d52]">
            A SaaS control plane for configuring chatbot drafts, publishing immutable versions,
            testing responses, and inspecting conversations.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {statusItems.map(([label, status]) => (
            <article
              key={label}
              className="rounded-lg border border-[#dbe7df] bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-semibold text-ink">{label}</h2>
              <p className="mt-2 text-sm text-[#5a6f62]">{status}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
