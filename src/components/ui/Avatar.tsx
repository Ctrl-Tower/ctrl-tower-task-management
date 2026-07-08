import type { UserDTO } from "@/lib/types";

function initials(name: string): string {
  // First letter of each word (true initials), capped at 3.
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 3).map((p) => p[0]).join("").toUpperCase();
}

export function Avatar({ user, size = 24 }: { user: UserDTO; size?: number }) {
  return (
    <span
      title={user.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-600 font-semibold text-neutral-100 ring-1 ring-neutral-900"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: UserDTO[]; max?: number }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-semibold text-neutral-200 ring-1 ring-neutral-900">
          +{extra}
        </span>
      )}
    </div>
  );
}
