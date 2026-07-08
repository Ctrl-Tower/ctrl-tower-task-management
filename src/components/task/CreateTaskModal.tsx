"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PRIORITIES, type CategoryDTO, type ColumnDTO, type Priority, type TaskDTO } from "@/lib/types";

interface Props {
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  defaultColumnId: string;
  parent?: TaskDTO; // when set, the new task is created as a subtask of this task
  onClose: () => void;
  onCreated: (t: TaskDTO) => void;
}

export function CreateTaskModal({ columns, categories, defaultColumnId, parent, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(parent?.columnId ?? defaultColumnId);
  const [categoryId, setCategoryId] = useState(parent?.categoryId ?? categories[0]?.id ?? "");
  const [priority, setPriority] = useState<Priority>(parent?.priority ?? "P2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const t = title.trim();
    if (!t) {
      setError("Title required");
      return;
    }
    if (!categoryId) {
      setError("Add a category in Settings first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, columnId, categoryId, priority, parentId: parent?.id ?? null }),
      });
      if (res.ok) {
        onCreated(await res.json());
        onClose();
      } else {
        setError((await res.json().catch(() => ({}))).error || "Failed to create");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} width="max-w-md">
      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">{parent ? "New subtask" : "New task"}</h2>
            {parent && <p className="mt-0.5 truncate text-xs text-neutral-500">under “{parent.title}”</p>}
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg leading-none">✕</button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="label">Title</label>
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  create();
                }
              }}
              rows={2}
              placeholder="What needs doing?"
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-4 gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    priority === p
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-neutral-300">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 bg-neutral-900/60 px-5 py-3">
          <button onClick={onClose} disabled={busy} className="btn-ghost border border-neutral-700 text-sm">Cancel</button>
          <button onClick={create} disabled={busy} className="btn-primary text-sm">
            {busy ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
