"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Modal } from "@/components/ui/Modal";
import { PRIORITIES, type CategoryDTO, type ColumnDTO, type Priority, type UserDTO } from "@/lib/types";

interface Proposal {
  title: string;
  priority: Priority;
  columnId: string;
  categoryId: string;
  assigneeIds: string[];
  selected: boolean;
}

interface BoardData {
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  users: UserDTO[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { data } = useSWR<BoardData>("/api/board", fetcher, { revalidateOnFocus: false });
  const columns = data?.columns ?? [];
  const categories = data?.categories ?? [];
  const users = data?.users ?? [];

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
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Import failed.");
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setProposals((d.tasks as any[]).map((t) => ({
        title: t.title,
        priority: t.priority,
        columnId: t.columnId || columns[0]?.id || "",
        categoryId: t.categoryId || categories[0]?.id || "",
        assigneeIds: t.assigneeIds ?? [],
        selected: true,
      })));
    } finally {
      setExtracting(false);
    }
  }

  function update(i: number, patch: Partial<Proposal>) {
    setProposals((p) => (p ? p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) : p));
  }

  function toggleAssignee(i: number, userId: string) {
    setProposals((p) =>
      p
        ? p.map((t, idx) =>
            idx === i
              ? {
                  ...t,
                  assigneeIds: t.assigneeIds.includes(userId)
                    ? t.assigneeIds.filter((id) => id !== userId)
                    : [...t.assigneeIds, userId],
                }
              : t,
          )
        : p,
    );
  }

  async function createTasks() {
    if (!proposals) return;
    const chosen = proposals.filter((p) => p.selected && p.title.trim());
    if (chosen.length === 0) return;
    setCreating(true);
    try {
      for (const t of chosen) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title.trim(),
            columnId: t.columnId || columns[0]?.id,
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
      <div className="flex max-h-[88vh] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Import notes</h2>
            <p className="text-xs text-neutral-500">
              Paste your meeting notes — AI extracts tasks, sets their status, and assigns people.
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost px-2 py-1 text-lg leading-none">✕</button>
        </div>

        {!proposals ? (
          <div className="space-y-4 p-5">
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={8}
              placeholder="Paste your meeting notes here…"
              className="input resize-y"
            />
            {error && <p className="text-sm text-neutral-300">{error}</p>}
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
                <p className="rounded-md border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
                  No clear tasks found in that note.
                </p>
              )}
              {proposals.map((t, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-neutral-800 bg-neutral-800/40 p-3">
                  <input
                    type="checkbox"
                    checked={t.selected}
                    onChange={(e) => update(i, { selected: e.target.checked })}
                    className="mt-1.5 accent-neutral-400"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      value={t.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium text-neutral-100 focus:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={t.columnId}
                        onChange={(e) => update(i, { columnId: e.target.value })}
                        className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300"
                      >
                        {columns.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <select
                        value={t.categoryId}
                        onChange={(e) => update(i, { categoryId: e.target.value })}
                        className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <select
                        value={t.priority}
                        onChange={(e) => update(i, { priority: e.target.value as Priority })}
                        className="rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-300"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    {users.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 text-[11px] text-neutral-500">Assign:</span>
                        {users.map((u) => {
                          const on = t.assigneeIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleAssignee(i, u.id)}
                              className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                                on
                                  ? "bg-neutral-100 text-neutral-900"
                                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                              }`}
                            >
                              {u.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="px-5 text-sm text-neutral-300">{error}</p>}
            <div className="flex items-center justify-between gap-3 border-t border-neutral-800 bg-neutral-900/60 px-5 py-3">
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
