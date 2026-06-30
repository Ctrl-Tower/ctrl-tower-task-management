import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getTaskDTO } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/tasks/[id]/notes — add a progress note.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await req.json();
    const text = (body.body || "").trim();
    if (!text) return NextResponse.json({ error: "Note body required" }, { status: 400 });

    await prisma.note.create({ data: { taskId: id, authorId: user.id, body: text } });
    return NextResponse.json(await getTaskDTO(id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/notes  body: { noteId }
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    if (body.noteId) await prisma.note.deleteMany({ where: { id: body.noteId, taskId: id } });
    return NextResponse.json(await getTaskDTO(id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
