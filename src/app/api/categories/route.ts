import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";

// POST /api/categories — create a swimlane category at the end.
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const last = await prisma.category.findFirst({ orderBy: { position: "desc" } });
    const cat = await prisma.category.create({
      data: { name, color: body.color || "#0ea5e9", position: last ? last.position + 1 : 0 },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/categories — reorder. body: { orderedIds: string[] }
export async function PATCH(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const ids: string[] = Array.isArray(body.orderedIds) ? body.orderedIds : [];
    await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { position: i } })));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
