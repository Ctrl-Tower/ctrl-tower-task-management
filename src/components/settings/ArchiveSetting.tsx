"use client";

import { useState } from "react";

export function ArchiveSetting({ initialDays }: { initialDays: number }) {
  const [days, setDays] = useState(String(initialDays));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveAfterDays: Number(days) }),
      });
      const data = await res.json();
      if (res.ok) {
        setDays(String(data.archiveAfterDays));
        setStatus("Saved.");
      } else {
        setStatus(data.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">Auto-archive</h2>
        <p className="text-xs text-neutral-500">
          Tasks left in the last column (Complete) for this many days are automatically archived and hidden from the board.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="label" htmlFor="archive-days">Days until archive</label>
          <input
            id="archive-days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="input w-28"
          />
        </div>
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save"}
        </button>
        {status && <span className="pb-2 text-xs text-neutral-400">{status}</span>}
      </div>
    </section>
  );
}
