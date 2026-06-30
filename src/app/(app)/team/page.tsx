import { prisma } from "@/lib/db";
import { TeamManager } from "@/components/team/TeamManager";
import type { UserDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  const dtos: UserDTO[] = users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor }));
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto p-6">
      <TeamManager initialUsers={dtos} />
    </div>
  );
}
