"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { UserDTO } from "@/lib/types";

export function TeamManager({ initialUsers }: { initialUsers: UserDTO[] }) {
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<UserDTO | null>(null);

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

  async function removeUser(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((u) => u.filter((x) => x.id !== id));
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to delete");
    }
  }

  function patchUser(updated: UserDTO) {
    setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)).sort((a, b) => a.name.localeCompare(b.name)));
    setEditing(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Team</h1>
        <p className="text-sm text-slate-400">Create accounts for your team members. They sign in with these credentials — there is no public sign-up.</p>
      </div>

      {/* Add form */}
      <form onSubmit={addUser} className="card-surface space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-200">Add a team member</h2>
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
        {error && <p className="text-sm text-slate-300">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Adding…" : "Add member"}
        </button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            editing={editing === u.id}
            onEdit={() => setEditing(editing === u.id ? null : u.id)}
            onSaved={patchUser}
            onDelete={() => setConfirmUser(u)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmUser}
        title={`Delete user “${confirmUser?.name ?? ""}”?`}
        message="This permanently removes the account. They will no longer be able to sign in. This cannot be undone."
        confirmLabel="Delete user"
        onConfirm={() => confirmUser && removeUser(confirmUser.id)}
        onClose={() => setConfirmUser(null)}
      />
    </div>
  );
}

function UserRow({
  user,
  editing,
  onEdit,
  onSaved,
  onDelete,
}: {
  user: UserDTO;
  editing: boolean;
  onEdit: () => void;
  onSaved: (u: UserDTO) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password: password || undefined }),
      });
      if (res.ok) onSaved(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-3">
        <Avatar user={user} size={32} />
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">{user.name}</p>
        </div>
        <button onClick={onEdit} className="btn-ghost text-xs">
          {editing ? "Cancel" : "Edit"}
        </button>
        <button onClick={onDelete} className="btn-ghost text-xs">
          Delete
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="leave blank to keep" />
          </div>
          <div className="sm:col-span-2">
            <button onClick={save} disabled={busy} className="btn-primary text-xs">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
