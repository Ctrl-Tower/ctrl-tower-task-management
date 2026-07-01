import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — update YOUR OWN name/colour only.
// You cannot edit other people's profiles or passwords; passwords change via
// /api/auth/change-password. There is no delete — users can only be created.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (id !== session.id) {
      return NextResponse.json({ error: "You can only edit your own profile" }, { status: 403 });
    }
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.avatarColor === "string") data.avatarColor = body.avatarColor;
    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ id: user.id, name: user.name, avatarColor: user.avatarColor });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.code === "P2002") return NextResponse.json({ error: "That name is already in use" }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
