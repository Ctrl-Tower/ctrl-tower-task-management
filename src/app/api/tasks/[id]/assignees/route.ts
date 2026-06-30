import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getTaskDTO } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/tasks/[id]/assignees  body: { userIds: string[] } — replace the full set.
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await req.json();
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
      prisma.taskAssignee.createMany({
        data: userIds.map((userId) => ({ taskId: id, userId })),
        skipDuplicates: true,
      }),
    ]);
    return NextResponse.json(await getTaskDTO(id));
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
