"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import {
  PRIORITIES,
  type CategoryDTO,
  type ColumnDTO,
  type LinkDTO,
  type NoteDTO,
  type Priority,
  type TaskDTO,
  type UserDTO,
} from "@/lib/types";

interface Props {
  task: TaskDTO;
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  users: UserDTO[];
  subtasks?: TaskDTO[];
  doneColumnId?: string;
  onClose: () => void;
  onOpenSubtask?: (id: string) => void;
  onAddSubtask?: () => void;
  onChange: (t: TaskDTO) => void;
  onDelete: () => void;
  onArchive: () => void;
}

// Draft rows carry the persisted id (existing) or a tmpId (new, not yet saved).
type DraftLink = (LinkDTO & { tmpId?: undefined }) | { id?: undefined; tmpId: string; url: string; label: string | null; kind: "GITHUB" | "URL" };
type DraftNote = (NoteDTO & { tmpId?: undefined }) | { id?: undefined; tmpId: string; body: string; author: UserDTO | null; createdAt: string };

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

// A scheme-less URL like "github.com" is otherwise treated as a relative path.
function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function TaskModal({ task, columns, categories, users, subtasks = [], doneColumnId, onClose, onOpenSubtask, onAddSubtask, onChange, onDelete, onArchive }: Props) {
  const columnName = (id: string) => columns.find((c) => c.id === id)?.name ?? "";
  // ---- staged draft state ----
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [columnId, setColumnId] = useState(task.columnId);
  const [categoryId, setCategoryId] = useState<string | null>(task.categoryId);
  const [startDate, setStartDate] = useState(toDateInput(task.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(task.dueDate));
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees.map((a) => a.id));
  const [links, setLinks] = useState<DraftLink[]>(task.links.map((l) => ({ ...l })));
  const [notes, setNotes] = useState<DraftNote[]>(task.notes.map((n) => ({ ...n })));

  // transient input state
  const [noteText, setNoteText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const tmp = useRef(0);

  // ---- dirty detection ----
  const removedLinkIds = task.links.filter((l) => !links.some((x) => x.id === l.id)).map((l) => l.id);
  const newLinks = links.filter((l) => l.tmpId);
  const removedNoteIds = task.notes.filter((n) => !notes.some((x) => x.id === n.id)).map((n) => n.id);
  const newNotes = notes.filter((n) => n.tmpId);
  const assigneesDirty =
    task.assignees.map((a) => a.id).sort().join(",") !== [...assigneeIds].sort().join(",");
  const coreDirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    priority !== task.priority ||
    columnId !== task.columnId ||
    categoryId !== task.categoryId ||
    startDate !== toDateInput(task.startDate) ||
    dueDate !== toDateInput(task.dueDate);
  const dirty =
    coreDirty || assigneesDirty || removedLinkIds.length > 0 || newLinks.length > 0 || removedNoteIds.length > 0 || newNotes.length > 0;

  // ---- staged mutations (local only) ----
  function stageNote() {
    const body = noteText.trim();
    if (!body) return;
    setNotes((n) => [...n, { tmpId: `n${++tmp.current}`, body, author: null, createdAt: new Date().toISOString() }]);
    setNoteText("");
  }
  function unstageNote(key: string) {
    setNotes((n) => n.filter((x) => (x.id ?? x.tmpId) !== key));
  }
  function stageLink() {
    const raw = normalizeUrl(linkUrl.trim());
    if (!raw) return;
    const kind: "GITHUB" | "URL" = /github\.com/i.test(raw) ? "GITHUB" : "URL";
    setLinks((l) => [...l, { tmpId: `l${++tmp.current}`, url: raw, label: linkLabel.trim() || null, kind }]);
    setLinkUrl("");
    setLinkLabel("");
  }
  function unstageLink(key: string) {
    setLinks((l) => l.filter((x) => (x.id ?? x.tmpId) !== key));
  }
  function toggleAssignee(userId: string) {
    setAssigneeIds((ids) => (ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId]));
  }

  // ---- apply everything on Save ----
  async function save() {
    setSaving(true);
    try {
      const id = task.id;
      const call = (url: string, method: string, body: unknown) =>
        fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (coreDirty) {
        await call(`/api/tasks/${id}`, "PATCH", {
          title: title.trim() || task.title,
          description,
          priority,
          columnId,
          categoryId,
          startDate: startDate || null,
          dueDate: dueDate || null,
        });
      }
      if (assigneesDirty) {
        await call(`/api/tasks/${id}/assignees`, "PUT", { userIds: assigneeIds });
      }
      for (const linkId of removedLinkIds) await call(`/api/tasks/${id}/links`, "DELETE", { linkId });
      for (const l of newLinks) await call(`/api/tasks/${id}/links`, "POST", { url: l.url, label: l.label, kind: l.kind });
      for (const noteId of removedNoteIds) await call(`/api/tasks/${id}/notes`, "DELETE", { noteId });
      for (const n of newNotes) await call(`/api/tasks/${id}/notes`, "POST", { body: n.body });

      const fresh = await fetch(`/api/tasks/${id}`);
      if (fresh.ok) onChange(await fresh.json());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) onDelete();
    else setSaving(false);
  }

  async function archive() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    if (res.ok) onArchive();
    else setSaving(false);
  }

  // A task can be archived manually once it's saved in the completion (Complete) column.
  const isDone = !!doneColumnId && task.columnId === doneColumnId;

  function handleClose() {
    if (dirty) setConfirmCancel(true);
    else onClose();
  }

  const assignedIds = new Set(assigneeIds);
  const assignedUsers = assigneeIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as UserDTO[];
  const categoryLabel = categories.find((c) => c.id === categoryId)?.name ?? "";
  const statusLabel = columns.find((c) => c.id === columnId)?.name ?? "";

  return (
    <>
      <Modal open onClose={handleClose} width="max-w-3xl">
        <div className="flex max-h-[88vh] flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 border-b border-neutral-800 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
                <span className="rounded border border-neutral-700 px-1.5 py-px text-neutral-400">{statusLabel}</span>
                {categoryLabel && (
                  <span className="rounded border border-neutral-700 px-1.5 py-px text-neutral-400">{categoryLabel}</span>
                )}
              </div>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={1}
                placeholder="Untitled task"
                className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-md bg-transparent px-2 py-0.5 text-xl font-semibold text-neutral-100 placeholder-neutral-600 transition-colors hover:bg-neutral-800/50 focus:bg-neutral-800/60 focus:outline-none"
              />
            </div>
            <button onClick={handleClose} className="btn-ghost shrink-0 px-2 py-1 text-lg leading-none">
              ✕
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-[1fr_280px]">
            {/* Main */}
            <div className="space-y-6 p-5">
              {/* Description */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Description</h3>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add a description…"
                  className="input min-h-[76px] resize-y"
                />
              </section>

              {/* Subtasks */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Subtasks{subtasks.length > 0 && ` · ${subtasks.filter((s) => s.completedAt).length}/${subtasks.length}`}
                  </h3>
                  {onAddSubtask && (
                    <button onClick={onAddSubtask} className="btn-ghost text-xs">+ Add subtask</button>
                  )}
                </div>
                {subtasks.length === 0 ? (
                  <p className="text-xs text-neutral-600">No subtasks yet.</p>
                ) : (
                  <div className="space-y-1">
                    {subtasks.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onOpenSubtask?.(s.id)}
                        className="flex w-full items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-left hover:border-neutral-600"
                      >
                        <span className={`min-w-0 flex-1 truncate text-sm ${s.completedAt ? "text-neutral-500 line-through" : "text-neutral-200"}`}>
                          {s.title}
                        </span>
                        <span className="shrink-0 rounded bg-neutral-800 px-1.5 py-px text-[10px] uppercase tracking-wide text-neutral-400">
                          {columnName(s.columnId)}
                        </span>
                        <span className="shrink-0 rounded bg-neutral-700 px-1 py-px text-[10px] font-semibold text-neutral-200">{s.priority}</span>
                        {s.assignees.length > 0 && <Avatar user={s.assignees[0]} size={18} />}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Links */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Links</h3>
                <ul className="space-y-1.5">
                  {links.map((l) => {
                    const key = l.id ?? l.tmpId!;
                    return (
                      <li key={key} className="group flex items-center gap-2.5 rounded-md border border-neutral-800 bg-neutral-800/40 px-2.5 py-2 text-sm">
                        <span className="rounded bg-neutral-700/70 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                          {l.kind === "GITHUB" ? "git" : "url"}
                        </span>
                        <a
                          href={normalizeUrl(l.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 truncate text-neutral-200 hover:text-white hover:underline"
                        >
                          {l.label || l.url}
                        </a>
                        <button
                          onClick={() => unstageLink(key)}
                          className="text-neutral-600 opacity-0 transition-opacity hover:text-neutral-200 group-hover:opacity-100"
                          aria-label="Remove link"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                  {links.length === 0 && (
                    <li className="rounded-md border border-dashed border-neutral-800 px-2.5 py-2 text-sm text-neutral-600">
                      No links yet.
                    </li>
                  )}
                </ul>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="github.com/… or any URL"
                    className="input sm:flex-1"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), stageLink())}
                  />
                  <input
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="input sm:w-36"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), stageLink())}
                  />
                  <button onClick={stageLink} className="btn-ghost border border-neutral-700">Add</button>
                </div>
              </section>

              {/* Progress notes */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Progress notes</h3>
                <div className="space-y-2">
                  {notes.map((n) => {
                    const key = n.id ?? n.tmpId!;
                    return (
                      <div key={key} className="group rounded-md border border-neutral-800 bg-neutral-800/40 p-3">
                        <div className="mb-1.5 flex items-center gap-2 text-xs text-neutral-400">
                          {n.author && <Avatar user={n.author} size={18} />}
                          <span className="font-medium text-neutral-300">{n.author?.name ?? "You"}</span>
                          <span className="text-neutral-600">·</span>
                          <span>{n.tmpId ? "unsaved" : new Date(n.createdAt).toLocaleString()}</span>
                          <button
                            onClick={() => unstageNote(key)}
                            className="ml-auto text-neutral-600 opacity-0 transition-opacity hover:text-neutral-200 group-hover:opacity-100"
                            aria-label="Remove note"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-neutral-200">{n.body}</p>
                      </div>
                    );
                  })}
                  {notes.length === 0 && (
                    <p className="rounded-md border border-dashed border-neutral-800 px-2.5 py-2 text-sm text-neutral-600">
                      No notes yet.
                    </p>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) stageNote();
                    }}
                    rows={2}
                    placeholder="Add a progress note… (⌘/Ctrl+Enter)"
                    className="input resize-y"
                  />
                  <button onClick={stageNote} className="btn-ghost self-end border border-neutral-700">Add</button>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 border-t border-neutral-800 bg-neutral-900/40 p-5 md:border-l md:border-t-0">
              <div>
                <label className="label">Status</label>
                <select className="input" value={columnId} onChange={(e) => setColumnId(e.target.value)}>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Priority</label>
                <div className="grid grid-cols-4 gap-1">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                        priority === p
                          ? "bg-neutral-100 text-neutral-900"
                          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Category</label>
                <select className="input" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Assignees</label>
                <div className="mb-2 flex flex-wrap gap-1">
                  {assignedUsers.map((a) => (
                    <span key={a.id} className="flex items-center gap-1 rounded-full bg-neutral-800 py-0.5 pl-0.5 pr-2 text-xs text-neutral-200">
                      <Avatar user={a} size={18} />
                      {a.name}
                    </span>
                  ))}
                  {assignedUsers.length === 0 && <span className="text-sm text-neutral-500">Unassigned</span>}
                </div>
                <button onClick={() => setAssigneeOpen((v) => !v)} className="btn-ghost border border-neutral-700 text-xs">
                  {assigneeOpen ? "Done" : "Edit assignees"}
                </button>
                {assigneeOpen && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-neutral-700 p-1">
                    {users.map((u) => (
                      <li key={u.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-800">
                          <input
                            type="checkbox"
                            checked={assignedIds.has(u.id)}
                            onChange={() => toggleAssignee(u.id)}
                            className="accent-neutral-400"
                          />
                          <Avatar user={u} size={18} />
                          {u.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Start</label>
                  <input type="date" className="input px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Due</label>
                  <input type="date" className="input px-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1 border-t border-neutral-800 pt-4">
                {isDone && (
                  <button
                    onClick={archive}
                    disabled={saving}
                    className="w-full rounded-md border border-neutral-700 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
                  >
                    Archive task
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="w-full rounded-md py-2 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-300"
                >
                  Delete task
                </button>
              </div>
            </aside>
          </div>

          {/* Footer: Save / Cancel */}
          <div className="flex items-center justify-between gap-3 border-t border-neutral-800 bg-neutral-900/60 px-5 py-3">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              {dirty && <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />}
              {dirty ? "Unsaved changes" : "No changes"}
            </span>
            <div className="flex gap-2">
              <button onClick={handleClose} disabled={saving} className="btn-ghost border border-neutral-700 text-sm">
                Cancel
              </button>
              <button onClick={save} disabled={saving || !dirty} className="btn-primary text-sm">
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete task “${task.title}”?`}
        message="This permanently deletes the task and its notes, links, and assignees. This cannot be undone."
        confirmLabel="Delete task"
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Discard changes?"
        message="You have unsaved changes. If you continue, they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={onClose}
        onClose={() => setConfirmCancel(false)}
      />
    </>
  );
}
