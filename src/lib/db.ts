import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'sessions.json');

export interface ChunkResult {
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  data: {
    transcription: string;
    translation: string;
    quickSummary: string;
  };
}

export interface Session {
  id: string;
  fileName: string;
  date: string;
  results: ChunkResult[];
}

export async function getSessions(): Promise<Session[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    return [];
  }
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  // Avoid duplicates
  const updated = [session, ...sessions.filter(s => s.id !== session.id)].slice(0, 100);
  await fs.writeFile(DB_PATH, JSON.stringify(updated, null, 2));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  const updated = sessions.filter(s => s.id !== id);
  await fs.writeFile(DB_PATH, JSON.stringify(updated, null, 2));
}

export async function renameSession(id: string, newName: string): Promise<void> {
  const sessions = await getSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.fileName = newName;
    await fs.writeFile(DB_PATH, JSON.stringify(sessions, null, 2));
  }
}

