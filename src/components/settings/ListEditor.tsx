"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Item {
  id: string;
  name: string;
  color: string;
  position: number;
}

// Editor for board categories (task labels). Status columns are fixed and not editable here.
export function ListEditor({
  title,
  initial,
  addLabel,
}: {
  title: string;
  initial: Item[];
  addLabel: string;
}) {
  const [items, setItems] = useState<Item[]>(initial);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmItem, setConfirmItem] = useState<Item | null>(null);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const created = await res.json();
        setItems((x) => [...x, created]);
        setNewName("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: Partial<Item>) {
    setItems((x) => x.map((i) => (i.id === id ? { ...i, ...data } : i)));
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async function remove(id: string) {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) setItems((x) => x.filter((i) => i.id !== id));
    else alert((await res.json().catch(() => ({}))).error || "Failed");
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((i) => i.id) }),
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
        <p className="text-xs text-neutral-500">Deleting a category leaves its tasks in place — they just become uncategorized.</p>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="card-surface flex items-center gap-2 p-2">
            <div className="flex flex-col">
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="px-1 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-30">▲</button>
              <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="px-1 text-xs text-neutral-500 hover:text-neutral-200 disabled:opacity-30">▼</button>
            </div>

            <input
              defaultValue={item.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== item.name) patch(item.id, { name: v });
              }}
              className="input flex-1"
            />

            <button onClick={() => setConfirmItem(item)} className="btn-ghost text-xs">
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={addLabel + "…"}
          className="input flex-1"
        />
        <button onClick={add} disabled={busy} className="btn-primary">
          {addLabel}
        </button>
      </div>

      <ConfirmDialog
        open={!!confirmItem}
        title={`Delete category “${confirmItem?.name ?? ""}”?`}
        message="This removes the category. Its tasks stay on the board and become uncategorized."
        confirmLabel="Delete category"
        onConfirm={() => confirmItem && remove(confirmItem.id)}
        onClose={() => setConfirmItem(null)}
      />
    </section>
  );
}
