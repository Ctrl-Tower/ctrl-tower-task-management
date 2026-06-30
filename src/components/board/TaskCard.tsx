"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AvatarStack } from "@/components/ui/Avatar";
import type { TaskDTO } from "@/lib/types";

function dueLabel(iso: string): { text: string; overdue: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const overdue = d.getTime() < now.setHours(0, 0, 0, 0);
  return { text: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), overdue };
}

export function TaskCard({
  task,
  categoryName,
  onOpen,
  overlay = false,
}: {
  task: TaskDTO;
  categoryName?: string;
  onOpen: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = task.dueDate ? dueLabel(task.dueDate) : null;
  const showPriority = task.priority === "P0" || task.priority === "P1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`cursor-grab touch-none rounded-md border border-slate-700 bg-slate-800 p-2.5 text-sm shadow-sm transition-colors hover:border-slate-500 active:cursor-grabbing ${
        overlay ? "shadow-xl ring-1 ring-slate-500" : ""
      }`}
    >
      {categoryName && (
        <span className="mb-1.5 inline-block rounded border border-slate-600 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-slate-300">
          {categoryName}
        </span>
      )}
      <p className="font-medium leading-snug text-slate-100">{task.title}</p>

      {(task.assignees.length > 0 || due || task.links.length > 0 || task.notes.length > 0 || showPriority) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {showPriority && (
              <span className="rounded bg-slate-700 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                {task.priority}
              </span>
            )}
            {due && <span className={due.overdue ? "font-semibold text-slate-200" : ""}>{due.text}</span>}
            {task.links.length > 0 && <span>{task.links.length} link{task.links.length > 1 ? "s" : ""}</span>}
            {task.notes.length > 0 && <span>{task.notes.length} note{task.notes.length > 1 ? "s" : ""}</span>}
          </div>
          {task.assignees.length > 0 && <AvatarStack users={task.assignees} />}
        </div>
      )}
    </div>
  );
}
