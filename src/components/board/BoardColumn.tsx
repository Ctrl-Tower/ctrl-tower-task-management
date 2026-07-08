"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { colDropId } from "./Board";
import { useBoardPrefs } from "./board-prefs";
import { type ColumnDTO, type Priority, type TaskDTO } from "@/lib/types";

interface Props {
  column: ColumnDTO;
  tasks: TaskDTO[];
  onOpenTask: (id: string) => void;
  onStartAdd: () => void;
}

const PRIORITY_RANK: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function BoardColumn({ column, tasks, onOpenTask, onStartAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: colDropId(column.id) });
  const { sort, passesFilter } = useBoardPrefs();

  const visible = useMemo(() => {
    const arr = tasks.filter(passesFilter);
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
  }, [tasks, sort, passesFilter]);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-neutral-800 bg-neutral-900/40">
      <header className="flex items-center justify-between gap-2 rounded-t-lg border-b border-neutral-800 bg-neutral-800 px-3 py-2">
        <span className="truncate text-sm font-semibold uppercase tracking-wide text-neutral-200">{column.name}</span>
        <span className="shrink-0 rounded bg-neutral-700 px-1.5 text-xs font-medium text-neutral-300">{visible.length}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${isOver ? "bg-neutral-800/40" : ""}`}
      >
        <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
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
