"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Modal } from "@/components/ui/Modal";
import { PRIORITIES, type CategoryDTO, type ColumnDTO, type Priority } from "@/lib/types";

interface Proposal {
  title: string;
  priority: Priority;
  categoryId: string;
  categoryName: string;
  assigneeIds: string[];
  assigneeNames: string[];
  selected: boolean;
}

interface Props {
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  onClose: () => void;
}

export function ImportModal({ columns, categories, onClose }: Props) {
  const [source, setSource] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);

  async function extract() {
    setError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/import/granola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProposals((data.tasks as any[]).map((t) => ({ ...t, selected: true })));
    } finally {
      setExtracting(false);
    }
  }

  function update(i: number, patch: Partial<Proposal>) {
    setProposals((p) => (p ? p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) : p));
  }

  async function createTasks() {
    if (!proposals) return;
    const chosen = proposals.filter((p) => p.selected && p.title.trim());
    if (chosen.length === 0) return;
    const columnId = columns[0]?.id;
    if (!columnId) {
      setError("No columns configured.");
      return;
    }
    setCreating(true);
    try {
      for (const t of chosen) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title.trim(),
            columnId,
            categoryId: t.categoryId || categories[0]?.id,
            priority: t.priority,
          }),
        });
        if (res.ok && t.assigneeIds.length > 0) {
          const created = await res.json();
          await fetch(`/api/tasks/${created.id}/assignees`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: t.assigneeIds }),
          });
        }
      }
      await mutate("/api/board");
      onClose();
    } finally {
      setCreating(false);
    }
  }

  const chosenCount = proposals?.filter((p) => p.selected).length ?? 0;

  return (
    <Modal open onClose={onClose} width="max-w-2xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Import from Granola</h2>
            <p className="text-xs text-slate-500">Paste a Granola share link or the note text — AI pulls out the action items.</p>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg leading-none">✕</button>
        </div>

        {!proposals ? (
          <div className="space-y-4 p-5">
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={8}
              placeholder="https://notes.granola.ai/…  — or paste the note text"
              className="input resize-y"
            />
            {error && <p className="text-sm text-slate-300">{error}</p>}
            <div className="flex justify-end">
              <button onClick={extract} disabled={extracting || !source.trim()} className="btn-primary text-sm">
                {extracting ? "Extracting…" : "Extract tasks"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
              {proposals.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-800 px-3 py-6 text-center text-sm text-slate-500">
                  No clear tasks found in that note.
                </p>
              )}
              {proposals.map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-800/40 p-3">
                  <input
                    type="checkbox"
                    checked={t.selected}
                    onChange={(e) => update(i, { selected: e.target.checked })}
                    className="mt-1.5 accent-slate-400"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={t.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium text-slate-100 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={t.categoryId}
                        onChange={(e) => update(i, { categoryId: e.target.value })}
                        className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-slate-300"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <select
                        value={t.priority}
                        onChange={(e) => update(i, { priority: e.target.value as Priority })}
                        className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-slate-300"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      {t.assigneeNames.length > 0 ? (
                        <span className="text-xs text-slate-400">→ {t.assigneeNames.join(", ")}</span>
                      ) : (
                        <span className="text-xs text-slate-600">unassigned</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="px-5 text-sm text-slate-300">{error}</p>}
            <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/60 px-5 py-3">
              <button onClick={() => setProposals(null)} className="btn-ghost text-sm">← Back</button>
              <button onClick={createTasks} disabled={creating || chosenCount === 0} className="btn-primary text-sm">
                {creating ? "Creating…" : `Create ${chosenCount} task${chosenCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
