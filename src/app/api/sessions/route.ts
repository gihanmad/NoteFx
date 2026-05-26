import { NextResponse } from "next/server";
import { getSessions, saveSession } from "@/lib/db";

export async function GET() {
  try {
    const sessions = await getSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await req.json();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }
    await saveSession(session);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Session Save Error:", error);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}

