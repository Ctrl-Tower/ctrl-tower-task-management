"use client";

import { useState } from "react";
import { AvatarStack } from "@/components/ui/Avatar";
import type { CategoryDTO, TaskDTO } from "@/lib/types";

export function ArchiveList({
  initialTasks,
  categories,
}: {
  initialTasks: TaskDTO[];
  categories: CategoryDTO[];
}) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [busyId, setBusyId] = useState<string | null>(null);

  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? "" : "");

  async function unarchive(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unarchive: true }),
      });
      if (res.ok) setTasks((t) => t.filter((x) => x.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Archive</h1>
        <p className="text-sm text-neutral-400">
          Completed tasks that were auto-archived. Restore one to put it back on the board.
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing archived yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="card-surface flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {categoryName(t.categoryId) && (
                    <span className="rounded border border-neutral-600 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-neutral-300">
                      {categoryName(t.categoryId)}
                    </span>
                  )}
                  {t.archivedAt && (
                    <span className="text-xs text-neutral-500">
                      archived {new Date(t.archivedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-medium text-neutral-100">{t.title}</p>
              </div>
              {t.assignees.length > 0 && <AvatarStack users={t.assignees} />}
              <button
                onClick={() => unarchive(t.id)}
                disabled={busyId === t.id}
                className="btn-ghost shrink-0 border border-neutral-700 text-xs"
              >
                {busyId === t.id ? "Restoring…" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
