import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — update a team member's name/colour.
// Passwords are NOT changeable here — each user changes their own via
// /api/auth/change-password, so no one can alter someone else's password.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
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

// DELETE /api/users/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (id === session.id) return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    const count = await prisma.user.count();
    if (count <= 1) return NextResponse.json({ error: "Cannot delete the last user" }, { status: 400 });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
