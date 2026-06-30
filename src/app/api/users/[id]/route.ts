import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword, UnauthorizedError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — update name/email/color/password.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.avatarColor === "string") data.avatarColor = body.avatarColor;
    if (typeof body.password === "string" && body.password) {
      if (body.password.length < 8)
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      data.passwordHash = await hashPassword(body.password);
    }
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
