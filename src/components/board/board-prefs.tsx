"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { PRIORITIES, type CategoryDTO, type Priority, type TaskDTO, type UserDTO } from "@/lib/types";

export type SortMode = "priority" | "due" | "manual";

export const SORT_LABELS: Record<SortMode, string> = {
  priority: "Priority",
  due: "Due date",
  manual: "Manual",
};

interface BoardPrefs {
  sort: SortMode;
  setSort: (s: SortMode) => void;
  priorities: Set<Priority>;
  togglePriority: (p: Priority) => void;
  assignee: string; // "" = anyone, "__none__" = unassigned, else user id
  setAssignee: (v: string) => void;
  category: string; // "" = all, else category id
  setCategory: (v: string) => void;
  filterActive: boolean;
  clearFilters: () => void;
  passesFilter: (t: TaskDTO) => boolean;
}

const Ctx = createContext<BoardPrefs | null>(null);

export function useBoardPrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBoardPrefs must be used within BoardPrefsProvider");
  return v;
}

// One board-wide sort + filter shared by every column and the nav controls.
export function BoardPrefsProvider({ children }: { children: React.ReactNode }) {
  const [sort, setSortState] = useState<SortMode>("priority");
  const [priorities, setPriorities] = useState<Set<Priority>>(new Set());
  const [assignee, setAssignee] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("board.sort");
    if (saved === "priority" || saved === "due" || saved === "manual") setSortState(saved);
  }, []);

  const setSort = (s: SortMode) => {
    setSortState(s);
    try { localStorage.setItem("board.sort", s); } catch {}
  };

  const togglePriority = (p: Priority) =>
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });

  const clearFilters = () => {
    setPriorities(new Set());
    setAssignee("");
    setCategory("");
  };

  const filterActive = priorities.size > 0 || !!assignee || !!category;

  const passesFilter = (t: TaskDTO) => {
    if (priorities.size > 0 && !priorities.has(t.priority)) return false;
    if (assignee === "__none__" && t.assignees.length > 0) return false;
    if (assignee && assignee !== "__none__" && !t.assignees.some((u) => u.id === assignee)) return false;
    if (category && t.categoryId !== category) return false;
    return true;
  };

  const value: BoardPrefs = {
    sort, setSort,
    priorities, togglePriority,
    assignee, setAssignee,
    category, setCategory,
    filterActive, clearFilters, passesFilter,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Single board-wide sort + filter popover (the sliders icon) — same controls that
// used to live on each column, now once at the top for the whole board.
export function BoardControls() {
  const { sort, setSort, priorities, togglePriority, assignee, setAssignee, category, setCategory, filterActive, clearFilters } = useBoardPrefs();
  const [open, setOpen] = useState(false);
  const { data } = useSWR<{ users: UserDTO[]; categories: CategoryDTO[] }>("/api/board", fetcher, { revalidateOnFocus: false });
  const users = useMemo(() => data?.users ?? [], [data]);
  const categories = useMemo(() => data?.categories ?? [], [data]);

  const active = filterActive || sort !== "priority";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Sort & filter"
        className={`rounded-md p-1.5 transition-colors hover:bg-neutral-800 ${
          active ? "text-neutral-100" : "text-neutral-400"
        }`}
      >
        {/* sliders icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="currentColor" />
          <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="currentColor" />
          <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 space-y-3 rounded-md border border-neutral-700 bg-neutral-900 p-3 text-xs shadow-xl">
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
                      priorities.has(p) ? "bg-neutral-100 text-neutral-900" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
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
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
    </div>
  );
}
