import { useEffect, useState, useMemo } from "react";

interface HealthData {
  ok?: boolean;
  services?: Record<string, unknown>;
  [key: string]: unknown;
}

const statusColor = (isOk: boolean) =>
  isOk ? "bg-green-600/20 text-green-700 dark:text-green-400" : "bg-destructive/20 text-destructive";

const chipCls =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border border-border";

export default function HealthStatus() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    async function run() {
      setError(null);
      setData(null);

      const tryFetch = async (url: string) => {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as HealthData;
      };

      const sameOrigin = `${window.location.origin}/api/health`;
      const devOrigin = `${window.location.protocol}//${window.location.hostname}:3001/api/health`;

      try {
        const d = await tryFetch(sameOrigin);
        setData(d);
      } catch (_) {
        try {
          const d = await tryFetch(devOrigin);
          setData(d);
        } catch (e: any) {
          setError(e?.message || "Unavailable");
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    run();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const items = useMemo(() => {
    const services = (data?.services ?? {}) as Record<string, unknown>;
    const keys = Object.keys(services);
    if (!keys.length) return [] as Array<{ key: string; ok: boolean; label: string }>;
    return keys.map((k) => {
      const v = services[k];
      const ok = typeof v === "boolean" ? v : String(v).toLowerCase() === "ok";
      const label = `${k}${typeof v === "string" && v !== "ok" ? `: ${v}` : ""}`;
      return { key: k, ok, label };
    });
  }, [data]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">Health:</span>
      {error && (
        <span className={`${chipCls} ${statusColor(false)}`}>Degraded ({error})</span>
      )}
      {!error && !data && <span className="text-muted-foreground">Checking…</span>}
      {!error && data && (
        <>
          {items.length === 0 ? (
            <span className={`${chipCls} ${statusColor(!!data.ok)}`}>
              {data.ok ? "OK" : "Degraded"}
            </span>
          ) : (
            items.map((i) => (
              <span key={i.key} className={`${chipCls} ${statusColor(i.ok)}`}>
                {i.label}
              </span>
            ))
          )}
        </>
      )}
    </div>
  );
}
