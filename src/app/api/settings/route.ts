import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth";
import { getArchiveAfterDays, setArchiveAfterDays } from "@/lib/settings";

// GET /api/settings — current board configuration.
export async function GET() {
  try {
    await requireSession();
    return NextResponse.json({ archiveAfterDays: await getArchiveAfterDays() });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/settings — update board configuration.
export async function PUT(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const days = Number(body.archiveAfterDays);
    if (!Number.isFinite(days) || days < 1) {
      return NextResponse.json({ error: "Enter a number of days (1 or more)" }, { status: 400 });
    }
    const saved = await setArchiveAfterDays(days);
    return NextResponse.json({ archiveAfterDays: saved });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
