import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const timeout = setTimeout(() => controller.abort(), 6000);

    async function run() {
      setError(null);
      const services: Record<string, unknown> = {};

      // Check Supabase Database
      try {
        const { error: dbError } = await supabase.from('messages').select('id').limit(1);
        services.Database = dbError ? 'error' : 'ok';
      } catch {
        services.Database = 'error';
      }

      // Check Supabase Auth
      try {
        const { error: authError } = await supabase.auth.getSession();
        services.Auth = authError ? 'error' : 'ok';
      } catch {
        services.Auth = 'error';
      }

      // Check Supabase Storage
      try {
        const { error: storageError } = await supabase.storage.listBuckets();
        services.Storage = storageError ? 'error' : 'ok';
      } catch {
        services.Storage = 'error';
      }

      // Check OpenAI via edge function
      try {
        const { data: ai, error: aiErr } = await supabase.functions.invoke("ai-health");
        if (!aiErr && ai) {
          services.OpenAI = (ai as any).ok ? "ok" : (ai as any).status ?? "degraded";
        } else {
          services.OpenAI = 'error';
        }
      } catch {
        services.OpenAI = 'unavailable';
      }

      // Determine overall health
      const allOk = Object.values(services).every(v => v === 'ok');
      setData({ ok: allOk, services });
      clearTimeout(timeout);
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
