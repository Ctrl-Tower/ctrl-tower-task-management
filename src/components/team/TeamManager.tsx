"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { UserDTO } from "@/lib/types";

export function TeamManager({ initialUsers, currentUserId }: { initialUsers: UserDTO[]; currentUserId: string }) {
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setUsers((u) => [...u, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Team</h1>
        <p className="text-sm text-neutral-400">
          Create accounts for your team members — they sign in with these credentials (no public sign-up).
          Everyone manages only their own name and password, from their account menu (top-right).
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={addUser} className="card-surface space-y-3 p-4">
        <h2 className="text-sm font-semibold text-neutral-200">Add a team member</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Temp password</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Share these credentials with them; they can change their own password after signing in.
        </p>
        {error && <p className="text-sm text-neutral-300">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Adding…" : "Add member"}
        </button>
      </form>

      {/* Read-only list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-200">Members</h2>
        {users.map((u) => (
          <div key={u.id} className="card-surface flex items-center gap-3 p-3">
            <Avatar user={u} size={32} />
            <p className="flex-1 text-sm font-medium text-neutral-100">{u.name}</p>
            {u.id === currentUserId && (
              <span className="rounded border border-neutral-700 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                You
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
