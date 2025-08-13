import { useEffect, useState } from "react";

export default function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const d = localStorage.getItem("dismissedDisclaimerV1");
    setDismissed(d === "1");
  }, []);

  if (dismissed) return null;

  return (
    <aside className="w-full border-b bg-muted/60">
      <div className="container mx-auto px-4 py-2 text-xs flex items-center justify-between gap-3">
        <p className="text-muted-foreground">
          AI is not a lawyer; information provided is general and not legal advice.
        </p>
        <button
          className="rounded-md px-2 py-1 text-foreground hover:bg-accent hover:text-accent-foreground transition"
          onClick={() => {
            localStorage.setItem("dismissedDisclaimerV1", "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </aside>
  );
}
