import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  service: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Server unreachable");
      });
  }, []);

  return (
    <main className="app">
      <header>
        <h1>CareBridge</h1>
        <p className="tagline">Text in → structured timeline + med list</p>
      </header>

      <section className="status-card" aria-live="polite">
        <h2>Server status</h2>
        {health && (
          <p className="ok">
            API connected ({health.service})
          </p>
        )}
        {error && <p className="error">API error: {error}</p>}
        {!health && !error && <p>Checking API…</p>}
      </section>
    </main>
  );
}
