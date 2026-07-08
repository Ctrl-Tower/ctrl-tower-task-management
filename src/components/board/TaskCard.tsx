"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AvatarStack } from "@/components/ui/Avatar";
import type { TaskDTO } from "@/lib/types";

function dueLabel(iso: string): { text: string; overdue: boolean } {
  const d = new Date(iso);
  // Due dates are stored as UTC midnight — render & compare in UTC so a
  // July 28 date never rolls back to July 27 in a behind-UTC timezone.
  const todayUTC = new Date();
  const startOfTodayUTC = Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate());
  const overdue = d.getTime() < startOfTodayUTC;
  return {
    text: `Due on ${d.toLocaleDateString(undefined, { month: "long", day: "numeric", timeZone: "UTC" })}`,
    overdue,
  };
}

export function TaskCard({
  task,
  subtasks = [],
  columnName,
  onOpen,
  onOpenSubtask,
  onAddSubtask,
  overlay = false,
}: {
  task: TaskDTO;
  subtasks?: TaskDTO[];
  columnName?: (id: string) => string;
  onOpen: () => void;
  onOpenSubtask?: (id: string) => void;
  onAddSubtask?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });
  const [expanded, setExpanded] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = task.dueDate ? dueLabel(task.dueDate) : null;
  const hasMeta = due || task.links.length > 0 || task.notes.length > 0;
  const doneCount = subtasks.filter((s) => s.completedAt).length;

  // Interactive children shouldn't start a drag or bubble to the card's onOpen.
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();

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
        <p className="line-clamp-2 min-w-0 flex-1 font-medium leading-snug text-neutral-100">{task.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.assignees.length > 0 && <AvatarStack users={task.assignees} />}
          <span className="rounded bg-neutral-700 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-neutral-200">
            {task.priority}
          </span>
        </div>
      </div>

      {hasMeta && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400">
          {due && <span className={due.overdue ? "font-semibold text-neutral-200" : ""}>{due.text}</span>}
          {task.links.length > 0 && <span>{task.links.length} link{task.links.length > 1 ? "s" : ""}</span>}
          {task.notes.length > 0 && <span>{task.notes.length} note{task.notes.length > 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Subtasks */}
      {(subtasks.length > 0 || onAddSubtask) && !overlay && (
        <div className="mt-1.5" onPointerDown={stop}>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            {subtasks.length > 0 ? (
              <button
                onClick={(e) => { stop(e); setExpanded((v) => !v); }}
                className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-neutral-700 hover:text-neutral-200"
              >
                <span className="inline-block w-2 text-center">{expanded ? "▾" : "▸"}</span>
                {doneCount}/{subtasks.length} subtasks
              </button>
            ) : (
              <span className="px-1 text-neutral-600">No subtasks</span>
            )}
            {onAddSubtask && (
              <button
                onClick={(e) => { stop(e); onAddSubtask(); }}
                className="ml-auto rounded px-1 py-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200"
              >
                + subtask
              </button>
            )}
          </div>

          {expanded && subtasks.length > 0 && (
            <div className="mt-1 space-y-1 border-l border-neutral-700 pl-2">
              {subtasks.map((s) => {
                const sdue = s.dueDate ? dueLabel(s.dueDate) : null;
                return (
                  <button
                    key={s.id}
                    onClick={(e) => { stop(e); onOpenSubtask?.(s.id); }}
                    className="flex w-full items-center gap-1.5 rounded border border-neutral-700 bg-neutral-800/60 px-1.5 py-1 text-left hover:border-neutral-500"
                  >
                    <span className={`min-w-0 flex-1 truncate text-xs ${s.completedAt ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                      {s.title}
                    </span>
                    {columnName && (
                      <span className="shrink-0 rounded bg-neutral-700 px-1 py-px text-[9px] uppercase tracking-wide text-neutral-300">
                        {columnName(s.columnId)}
                      </span>
                    )}
                    <span className="shrink-0 rounded bg-neutral-700 px-1 py-px text-[9px] font-semibold text-neutral-200">{s.priority}</span>
                    {s.assignees.length > 0 && <AvatarStack users={s.assignees} />}
                    {sdue && <span className="shrink-0 text-[9px] text-neutral-400">{sdue.text.replace("Due on ", "")}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
