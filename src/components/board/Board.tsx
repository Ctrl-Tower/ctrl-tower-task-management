"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { CategoryDTO, ColumnDTO, TaskDTO, UserDTO } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { BoardColumn } from "./BoardColumn";
import { TaskModal } from "@/components/task/TaskModal";
import { CreateTaskModal } from "@/components/task/CreateTaskModal";

export const colDropId = (columnId: string) => `col:${columnId}`;
const parseCol = (id: string) => id.replace(/^col:/, "");

interface Props {
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  initialTasks: TaskDTO[];
  users: UserDTO[];
}

export function Board({ columns, categories, initialTasks, users }: Props) {
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [createCol, setCreateCol] = useState<string | null>(null);
  const snapshot = useRef<TaskDTO[]>(initialTasks);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? "",
    [categories],
  );

  // tasks grouped by column, sorted by position
  const grouped = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const col of columns) map.set(col.id, []);
    for (const t of tasks) {
      if (!map.has(t.columnId)) map.set(t.columnId, []);
      map.get(t.columnId)!.push(t);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [tasks, columns]);

  const columnOf = useCallback(
    (id: string): string | null => {
      if (id.startsWith("col:")) return parseCol(id);
      const t = tasks.find((x) => x.id === id);
      return t ? t.columnId : null;
    },
    [tasks],
  );

  function onDragStart(e: DragStartEvent) {
    snapshot.current = tasks;
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const from = columnOf(activeIdStr);
    const to = columnOf(overIdStr);
    if (!from || !to || from === to) return;

    // Move active task into the target column (visual only; category unchanged).
    setTasks((prev) => {
      const moving = prev.find((t) => t.id === activeIdStr);
      if (!moving) return prev;
      const without = prev.filter((t) => t.id !== activeIdStr);
      const inTarget = without.filter((t) => t.columnId === to).sort((a, b) => a.position - b.position);
      const overTask = without.find((t) => t.id === overIdStr);
      const insertIdx = overTask ? inTarget.findIndex((t) => t.id === overIdStr) : inTarget.length;
      inTarget.splice(insertIdx < 0 ? inTarget.length : insertIdx, 0, { ...moving, columnId: to });
      const renum = inTarget.map((t, i) => ({ ...t, position: i }));
      const others = without.filter((t) => t.columnId !== to);
      return [...others, ...renum];
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const to = columnOf(overIdStr);
    if (!to) return;

    // Reorder within the final column.
    let finalIndex = 0;
    setTasks((prev) => {
      const inTarget = prev.filter((t) => t.columnId === to).sort((a, b) => a.position - b.position);
      const oldIndex = inTarget.findIndex((t) => t.id === activeIdStr);
      let newIndex = inTarget.findIndex((t) => t.id === overIdStr);
      if (newIndex < 0) newIndex = inTarget.length - 1;
      const reordered = oldIndex >= 0 ? arrayMove(inTarget, oldIndex, Math.max(0, newIndex)) : inTarget;
      finalIndex = reordered.findIndex((t) => t.id === activeIdStr);
      const renum = reordered.map((t, i) => ({ ...t, position: i, columnId: to }));
      const others = prev.filter((t) => t.columnId !== to);
      return [...others, ...renum];
    });

    // Persist (column + position only — category is a label, untouched).
    try {
      const res = await fetch(`/api/tasks/${activeIdStr}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: to, position: Math.max(0, finalIndex) }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setTasks(snapshot.current); // revert
    }
  }

  function upsertTask(updated: TaskDTO) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === updated.id);
      return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [...prev, updated];
    });
  }

  // Remove a task from the board (used by both delete and archive — archived
  // tasks simply leave the board view).
  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setOpenTaskId(null);
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  return (
    <div className="h-full overflow-x-auto bg-slate-950 p-3">
      <DndContext
        id="task-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full min-w-max gap-3">
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={grouped.get(col.id) ?? []}
              categoryName={categoryName}
              onOpenTask={setOpenTaskId}
              onStartAdd={() => setCreateCol(col.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} categoryName={categoryName(activeTask.categoryId)} onOpen={() => {}} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {createCol && (
        <CreateTaskModal
          columns={columns}
          categories={categories}
          defaultColumnId={createCol}
          onClose={() => setCreateCol(null)}
          onCreated={(t) => upsertTask(t)}
        />
      )}

      {openTask && (
        <TaskModal
          task={openTask}
          columns={columns}
          categories={categories}
          users={users}
          doneColumnId={columns[columns.length - 1]?.id}
          onClose={() => setOpenTaskId(null)}
          onChange={upsertTask}
          onDelete={() => removeTask(openTask.id)}
          onArchive={() => removeTask(openTask.id)}
        />
      )}
    </div>
  );
}
