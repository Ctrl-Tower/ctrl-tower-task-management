import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword, UnauthorizedError } from "@/lib/auth";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export async function GET() {
  try {
    await requireSession();
    const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(
      users.map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor })),
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/users — create a team member.
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const name = (body.name || "").trim();
    const password = body.password || "";
    if (!name || !password) {
      return NextResponse.json({ error: "Full name and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (existing) return NextResponse.json({ error: "That name is already in use" }, { status: 409 });

    const count = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        name,
        passwordHash: await hashPassword(password),
        avatarColor: body.avatarColor || COLORS[count % COLORS.length],
      },
    });
    return NextResponse.json(
      { id: user.id, name: user.name, avatarColor: user.avatarColor },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
