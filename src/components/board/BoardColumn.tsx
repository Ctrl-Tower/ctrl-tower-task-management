"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { colDropId } from "./Board";
import type { ColumnDTO, TaskDTO } from "@/lib/types";

interface Props {
  column: ColumnDTO;
  tasks: TaskDTO[];
  categoryName: (categoryId: string) => string;
  onOpenTask: (id: string) => void;
  onStartAdd: () => void;
}

export function BoardColumn({ column, tasks, categoryName, onOpenTask, onStartAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: colDropId(column.id) });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-slate-800 bg-slate-900/40">
      <header className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-slate-800 px-3 py-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-200">{column.name}</span>
        <span className="rounded bg-slate-700 px-1.5 text-xs font-medium text-slate-300">{tasks.length}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${isOver ? "bg-slate-800/40" : ""}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} categoryName={categoryName(t.categoryId)} onOpen={() => onOpenTask(t.id)} />
          ))}
        </SortableContext>
      </div>

      <button
        onClick={onStartAdd}
        className="m-2 rounded-md py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      >
        + Add task
      </button>
    </div>
  );
}
