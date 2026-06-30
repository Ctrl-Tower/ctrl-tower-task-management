"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import type { UserDTO } from "@/lib/types";

export function AccountModal({ user, onClose }: { user: UserDTO; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function save() {
    setError(null);
    if (next !== confirm) {
      setError("New passwords don't match");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setError(data.error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} width="max-w-sm">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Avatar user={user} size={28} />
            <span className="text-base font-semibold text-slate-100">{user.name}</span>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-4 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Change your password</h3>

          {done ? (
            <p className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
              Password updated. Use it next time you sign in.
            </p>
          ) : (
            <>
              <div>
                <label className="label">Current password</label>
                <input type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div>
                <label className="label">New password</label>
                <input type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-slate-300">{error}</p>}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900/60 px-5 py-3">
          <button onClick={onClose} className="btn-ghost border border-slate-700 text-sm">
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button onClick={save} disabled={busy} className="btn-primary text-sm">
              {busy ? "Saving…" : "Update password"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
