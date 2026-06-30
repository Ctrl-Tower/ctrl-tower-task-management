import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/categories/[id] — rename / recolor.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.color === "string") data.color = body.color;
    const cat = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(cat);
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — also deletes its tasks (schema cascade).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const count = await prisma.category.count();
    if (count <= 1) return NextResponse.json({ error: "Keep at least one category" }, { status: 400 });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
