"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  History, 
  Music2, 
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  FileText,
  Search,
  Loader2
} from "lucide-react";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSessions();
    // Refresh sessions periodically or listen for custom event
    const handleRefresh = () => fetchSessions();
    window.addEventListener('refresh-sessions', handleRefresh);
    return () => window.removeEventListener('refresh-sessions', handleRefresh);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ newName: editName }),
      });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, fileName: editName } : s));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-72 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Music2 size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase italic">NoteFx</span>
        </Link>
      </div>

      {/* New Transcription Button */}
      <div className="px-4 mb-6">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 w-full py-3 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl font-bold transition-all border border-primary/20 shadow-sm active:scale-95"
        >
          <Plus size={18} /> New Note
        </Link>
      </div>

      {/* Search History */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-10">
        <div className="flex items-center justify-between mb-2 px-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Sessions</span>
           <History size={12} className="text-muted-foreground" />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary/40" size={20} />
          </div>
        ) : filteredSessions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-10 px-4">No history found. Start by uploading an audio file.</p>
        ) : (
          filteredSessions.map((session) => (
            <div key={session.id} className="group relative">
              {editingId === session.id ? (
                <form onSubmit={(e) => handleRename(session.id, e)} className="px-2 py-1">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => setEditingId(null)}
                    className="w-full bg-secondary border border-primary/50 rounded px-2 py-1 text-xs focus:outline-none"
                  />
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/history?session=${session.id}`}
                    className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group overflow-hidden"
                  >
                    <FileText size={16} className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate leading-tight">{session.fileName}</p>
                      <p className="text-[10px] leading-tight mt-0.5 opacity-50">{session.date.split(',')[0]}</p>
                    </div>
                  </Link>
                  
                  {/* Action Dots */}
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gradient-to-l from-secondary pr-1 pl-4 h-full transition-opacity">
                    <button 
                      onClick={() => { setEditingId(session.id); setEditName(session.fileName); }}
                      className="p-1.5 hover:bg-primary/20 rounded-md text-muted-foreground hover:text-primary"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(session.id, e)}
                      className="p-1.5 hover:bg-destructive/20 rounded-md text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary/60 border border-border flex items-center justify-center text-[10px] font-bold">GW</div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Gihan Wanasooriya</p>
            <p className="text-[10px] text-muted-foreground">Pro Researcher</p>
          </div>
        </div>
      </div>
    </div>
  );
}
