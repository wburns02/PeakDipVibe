import { useState, useEffect } from "react";
import { Sunrise, Clock } from "lucide-react";
import { getGreeting, getMarketStatus } from "../lib/scoring";

export function PulseHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const greeting = getGreeting();
  const market = getMarketStatus();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const statusColor =
    market.status === "open"
      ? "bg-green"
      : market.status === "pre-market" || market.status === "after-hours"
        ? "bg-amber"
        : "bg-text-muted";

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
              <Sunrise className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Morning Pulse
              </h1>
              <p className="text-xs text-text-muted">{greeting}. {dateStr}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5`}>
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${statusColor} ${market.status === "open" ? "animate-ping opacity-75" : ""}`}
              />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusColor}`} />
            </span>
            <span className="text-sm font-medium text-text-primary">
              {market.label}
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className="h-3 w-3" />
            {market.countdown}
          </div>
        </div>
      </div>
    </div>
  );
}
