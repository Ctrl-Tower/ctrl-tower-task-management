import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Load fresh user (name/color may have changed since the token was issued).
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");

  const dto = { id: user.id, name: user.name, avatarColor: user.avatarColor };

  return (
    <div className="flex h-screen flex-col">
      <NavBar user={dto} />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
