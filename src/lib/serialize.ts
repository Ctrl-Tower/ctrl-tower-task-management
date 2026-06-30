import { prisma } from "@/lib/db";
import type { TaskDTO, UserDTO } from "@/lib/types";

// Prisma include used everywhere we return a full task.
export const taskInclude = {
  assignees: { include: { user: true } },
  notes: { include: { author: true }, orderBy: { createdAt: "asc" } },
  links: true,
} as const;

type RawUser = {
  id: string;
  name: string;
  avatarColor: string;
};

function userDTO(u: RawUser): UserDTO {
  return { id: u.id, name: u.name, avatarColor: u.avatarColor };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTaskDTO(t: any): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    priority: t.priority,
    position: t.position,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    columnId: t.columnId,
    categoryId: t.categoryId,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    archivedAt: t.archivedAt ? t.archivedAt.toISOString() : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assignees: (t.assignees ?? []).map((a: any) => userDTO(a.user)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes: (t.notes ?? []).map((n: any) => ({
      id: n.id,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      author: n.author ? userDTO(n.author) : null,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    links: (t.links ?? []).map((l: any) => ({ id: l.id, url: l.url, label: l.label ?? null, kind: l.kind })),
  };
}

export async function getTaskDTO(id: string): Promise<TaskDTO | null> {
  const t = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  return t ? toTaskDTO(t) : null;
}
