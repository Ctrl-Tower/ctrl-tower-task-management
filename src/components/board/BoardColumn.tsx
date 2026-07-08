"use client";

import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { colDropId } from "./Board";
import { PRIORITIES, type CategoryDTO, type ColumnDTO, type Priority, type TaskDTO, type UserDTO } from "@/lib/types";

type SortMode = "priority" | "due" | "manual";

interface Props {
  column: ColumnDTO;
  tasks: TaskDTO[];
  childrenByParent: Map<string, TaskDTO[]>;
  columnName: (id: string) => string;
  users: UserDTO[];
  categories: CategoryDTO[];
  onOpenTask: (id: string) => void;
  onAddSubtask: (parent: TaskDTO) => void;
  onStartAdd: () => void;
}

const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function BoardColumn({ column, tasks, childrenByParent, columnName, users, categories, onOpenTask, onAddSubtask, onStartAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: colDropId(column.id) });
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<SortMode>("priority");
  const [fPriority, setFPriority] = useState<Set<Priority>>(new Set());
  const [fAssignee, setFAssignee] = useState<string>("");
  const [fCategory, setFCategory] = useState<string>("");

  const filterActive = fPriority.size > 0 || !!fAssignee || !!fCategory;

  const visible = useMemo(() => {
    let list = tasks;
    if (fPriority.size > 0) list = list.filter((t) => fPriority.has(t.priority));
    if (fAssignee === "__none__") list = list.filter((t) => t.assignees.length === 0);
    else if (fAssignee) list = list.filter((t) => t.assignees.some((u) => u.id === fAssignee));
    if (fCategory) list = list.filter((t) => t.categoryId === fCategory);

    const arr = [...list];
    if (sort === "priority") {
      arr.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.position - b.position);
    } else if (sort === "due") {
      arr.sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db || a.position - b.position;
      });
    } else {
      arr.sort((a, b) => a.position - b.position);
    }
    return arr;
  }, [tasks, sort, fPriority, fAssignee, fCategory]);

  function togglePriority(p: Priority) {
    setFPriority((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function clearFilters() {
    setFPriority(new Set());
    setFAssignee("");
    setFCategory("");
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-neutral-800 bg-neutral-900/40">
      <header className="relative flex items-center justify-between gap-2 rounded-t-lg border-b border-neutral-800 bg-neutral-800 px-3 py-2">
        <span className="truncate text-sm font-semibold uppercase tracking-wide text-neutral-200">{column.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setOpen((v) => !v)}
            title="Sort & filter"
            className={`rounded p-1 text-xs transition-colors hover:bg-neutral-700 ${
              filterActive || sort !== "priority" ? "text-neutral-100" : "text-neutral-400"
            }`}
          >
            {/* sliders icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="currentColor" />
              <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="currentColor" />
              <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2" fill="currentColor" />
            </svg>
          </button>
          <span className="rounded bg-neutral-700 px-1.5 text-xs font-medium text-neutral-300">{visible.length}</span>
        </div>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-2 top-full z-20 mt-1 w-56 space-y-3 rounded-md border border-neutral-700 bg-neutral-900 p-3 text-xs shadow-xl">
              <div>
                <label className="mb-1 block font-medium uppercase tracking-wide text-neutral-500">Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-neutral-200"
                >
                  <option value="priority">Priority</option>
                  <option value="due">Due date</option>
                  <option value="manual">Manual (drag order)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium uppercase tracking-wide text-neutral-500">Priority</label>
                <div className="flex gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`flex-1 rounded px-1 py-0.5 font-semibold transition-colors ${
                        fPriority.has(p) ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium uppercase tracking-wide text-neutral-500">Assignee</label>
                <select
                  value={fAssignee}
                  onChange={(e) => setFAssignee(e.target.value)}
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-neutral-200"
                >
                  <option value="">Anyone</option>
                  <option value="__none__">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-medium uppercase tracking-wide text-neutral-500">Category</label>
                <select
                  value={fCategory}
                  onChange={(e) => setFCategory(e.target.value)}
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-neutral-200"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {filterActive && (
                <button onClick={clearFilters} className="w-full rounded bg-neutral-800 py-1 text-neutral-300 hover:bg-neutral-700">
                  Clear filters
                </button>
              )}
            </div>
          </>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${isOver ? "bg-neutral-800/40" : ""}`}
      >
        <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visible.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              subtasks={childrenByParent.get(t.id) ?? []}
              columnName={columnName}
              onOpen={() => onOpenTask(t.id)}
              onOpenSubtask={onOpenTask}
              onAddSubtask={() => onAddSubtask(t)}
            />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={onStartAdd}
        className="m-2 rounded-md py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
      >
        + Add task
      </button>
    </div>
  );
}
