import { NextResponse } from "next/server";
import { deleteSession, renameSession } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    await deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { newName } = await req.json();
    if (!newName) return NextResponse.json({ error: "New name is required" }, { status: 400 });
    
    await renameSession(id, newName);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to rename session" }, { status: 500 });
  }
}
