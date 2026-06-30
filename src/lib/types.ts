// Shared client-facing shapes (plain JSON — dates serialized as ISO strings).

// P0 = most urgent … P3 = lowest.
export type Priority = "P0" | "P1" | "P2" | "P3";
export type LinkKind = "GITHUB" | "URL";

export interface UserDTO {
  id: string;
  name: string;
  avatarColor: string;
}

export interface ColumnDTO {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface NoteDTO {
  id: string;
  body: string;
  createdAt: string;
  author: UserDTO | null;
}

export interface LinkDTO {
  id: string;
  url: string;
  label: string | null;
  kind: LinkKind;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  position: number;
  startDate: string | null;
  dueDate: string | null;
  columnId: string;
  categoryId: string;
  completedAt: string | null;
  archivedAt: string | null;
  assignees: UserDTO[];
  notes: NoteDTO[];
  links: LinkDTO[];
}

export const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
