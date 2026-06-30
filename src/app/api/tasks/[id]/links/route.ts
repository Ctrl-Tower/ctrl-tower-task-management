import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getTaskDTO } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

function normalize(url: string): string {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return `https://${u}`;
  return u;
}

// POST /api/tasks/[id]/links  body: { url, label?, kind? }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    const raw = (body.url || "").trim();
    if (!raw) return NextResponse.json({ error: "URL required" }, { status: 400 });
    const url = normalize(raw);
    const kind = body.kind === "GITHUB" || /github\.com/i.test(url) ? "GITHUB" : "URL";

    await prisma.link.create({
      data: { taskId: id, url, label: (body.label || "").trim() || null, kind },
    });
    return NextResponse.json(await getTaskDTO(id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/links  body: { linkId }
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    if (body.linkId) await prisma.link.deleteMany({ where: { id: body.linkId, taskId: id } });
    return NextResponse.json(await getTaskDTO(id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
