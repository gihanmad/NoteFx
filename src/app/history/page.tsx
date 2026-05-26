"use client";

import React, { useState, useEffect, Suspense } from "react";
import { 
  ArrowLeft, 
  Trash2, 
  Calendar, 
  FileAudio, 
  Search,
  BookOpen,
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { TranscriptionResults } from "@/components/dashboard/TranscriptionResults";
import { useSearchParams } from "next/navigation";

interface Session {
  id: string;
  fileName: string;
  date: string;
  results: any[];
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && sessionIdParam) {
      const session = sessions.find(s => s.id === sessionIdParam);
      if (session) setSelectedSession(session);
    }
  }, [sessions, sessionIdParam]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedSession) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setSelectedSession(null)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{selectedSession.fileName}</h1>
            <p className="text-sm text-muted-foreground">{selectedSession.date}</p>
          </div>
        </div>

        <TranscriptionResults 
          results={selectedSession.results} 
          isComplete={true} 
          fileName={selectedSession.fileName} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             Session History
          </h1>
          <p className="text-muted-foreground mt-2">Access your past transcriptions and lecture notes from any browser.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search file name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-secondary/20 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading your history from the system...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-card/40 hover:bg-card border border-border hover:border-primary/30 rounded-2xl p-6 transition-all shadow-lg hover:shadow-primary/5 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                        <BookOpen size={24} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate pr-2 group-hover:text-primary transition-colors">
                          {session.fileName}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} /> {session.date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileAudio size={14} /> {session.results.length} Parts
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="p-3 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                      
                      <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground px-6 transition-all flex items-center gap-2 font-bold whitespace-nowrap">
                         View Notes <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-24 bg-card/20 rounded-3xl border border-dashed border-border">
                <BookOpen className="mx-auto text-muted-foreground mb-4 opacity-20" size={64} />
                <h3 className="text-xl font-bold">No sessions found</h3>
                <p className="text-muted-foreground mt-2">Try uploading a new lecture to see it here.</p>
                <Link href="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold mt-6 hover:scale-105 transition-all">
                    Upload Now <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading History...</p>
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}
