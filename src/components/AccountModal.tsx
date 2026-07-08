"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import type { UserDTO } from "@/lib/types";

export function AccountModal({ user, onClose }: { user: UserDTO; onClose: () => void }) {
  const router = useRouter();

  // Profile (name)
  const [name, setName] = useState(user.name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user.name) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setNameMsg("Saved. This is also your sign-in name.");
        router.refresh();
      } else {
        setNameMsg(data.error || "Failed");
      }
    } finally {
      setNameBusy(false);
    }
  }

  async function savePassword() {
    setPwError(null);
    if (next !== confirm) {
      setPwError("New passwords don't match");
      return;
    }
    if (next.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setPwError(data.error || "Failed");
      }
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} width="max-w-sm">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Avatar user={user} size={28} />
            <span className="text-base font-semibold text-neutral-100">Your account</span>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-6 p-5">
          {/* Name */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Display name</h3>
            <div className="flex gap-2">
              <input className="input flex-1" value={name} onChange={(e) => setName(e.target.value)} />
              <button onClick={saveName} disabled={nameBusy || !name.trim() || name.trim() === user.name} className="btn-primary text-sm">
                {nameBusy ? "…" : "Save"}
              </button>
            </div>
            {nameMsg && <p className="text-xs text-neutral-400">{nameMsg}</p>}
          </section>

          {/* Password */}
          <section className="space-y-3 border-t border-neutral-800 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Change password</h3>
            {pwDone ? (
              <p className="rounded-md border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-200">
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
                {pwError && <p className="text-sm text-neutral-300">{pwError}</p>}
                <button onClick={savePassword} disabled={pwBusy} className="btn-primary text-sm">
                  {pwBusy ? "Saving…" : "Update password"}
                </button>
              </>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-800 bg-neutral-900/60 px-5 py-3">
          <button onClick={onClose} className="btn-ghost border border-neutral-700 text-sm">Close</button>
        </div>
      </div>
    </Modal>
  );
}
