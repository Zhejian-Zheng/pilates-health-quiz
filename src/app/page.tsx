export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-6 py-10 text-[#171717]">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3c8786]">
            Pilates Health Quiz
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            Health assessment funnel backend foundation
          </h1>
          <p className="max-w-2xl text-base leading-7 text-black/65">
            Phase one is wired: create an anonymous session, save quiz answers
            step by step, and recover progress after a refresh or browser close.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Create session", "POST /api/sessions"],
            ["Recover progress", "GET /api/sessions/{sessionId}"],
            ["Save answers", "PATCH /api/sessions/{sessionId}/answers"],
          ].map(([title, endpoint]) => (
            <div
              className="rounded-lg border border-black/10 bg-white p-5 shadow-sm"
              key={endpoint}
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 break-words font-mono text-sm text-black/60">
                {endpoint}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Quick API check</h2>
          <pre className="mt-4 overflow-x-auto rounded-md bg-[#171717] p-4 text-sm leading-6 text-white">
            {`curl -X POST http://localhost:3000/api/sessions \\
  -H "Content-Type: application/json" \\
  -d '{"flowId":"2117"}'

curl -X PATCH http://localhost:3000/api/sessions/{sessionId}/answers \\
  -H "Content-Type: application/json" \\
  -d '{"currentStep":1,"answers":[{"stepKey":"goal","questionKey":"goal","value":"Lose weight"}]}'`}
          </pre>
        </div>
      </section>
    </main>
  );
}
