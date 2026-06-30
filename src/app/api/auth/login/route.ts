import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const password = body.password || "";
  if (!name || !password) {
    return NextResponse.json({ error: "Full name and password required" }, { status: 400 });
  }

  // Match the full name case-insensitively.
  const user = await prisma.user.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  // Constant-ish behaviour: verify against a hash even if no user.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid name or password" }, { status: 401 });
  }

  const token = await signSession({ id: user.id, name: user.name });
  await setSessionCookie(token);
  return NextResponse.json({ id: user.id, name: user.name });
}
