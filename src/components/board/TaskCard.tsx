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
  onOpen,
  overlay = false,
}: {
  task: TaskDTO;
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
  const hasMeta = task.assignees.length > 0 || due || task.links.length > 0 || task.notes.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`cursor-grab touch-none rounded-md border border-neutral-700 bg-neutral-800 p-2 text-sm transition-colors hover:border-neutral-500 active:cursor-grabbing ${
        overlay ? "shadow-xl ring-1 ring-neutral-500" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium leading-snug text-neutral-100">{task.title}</p>
        <span className="shrink-0 rounded bg-neutral-700 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-neutral-200">
          {task.priority}
        </span>
      </div>

      {hasMeta && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            {due && <span className={due.overdue ? "font-semibold text-neutral-200" : ""}>{due.text}</span>}
            {task.links.length > 0 && <span>{task.links.length} link{task.links.length > 1 ? "s" : ""}</span>}
            {task.notes.length > 0 && <span>{task.notes.length} note{task.notes.length > 1 ? "s" : ""}</span>}
          </div>
          {task.assignees.length > 0 && <AvatarStack users={task.assignees} />}
        </div>
      )}
    </div>
  );
}
