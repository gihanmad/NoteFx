"use client";

import React, { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  BookOpen, 
  Languages, 
  Clock,
  Image as ImageIcon,
  History,
  Trash2,
  ArrowLeft
} from "lucide-react";

// Global style injection to fix selection issues
const SelectionFix = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .prose, .prose *, .select-text, .select-text * {
      user-select: text !important;
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      cursor: text !important;
    }
  `}} />
);

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/utils/cn";
import { exportToMarkdown, exportToPDF } from "@/utils/export";
import Link from "next/link";

interface ChunkResult {
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  data: {
    transcription: string;
    translation: string;
    quickSummary: string;
  };
}

interface Session {
  id: string;
  fileName: string;
  date: string;
  results: ChunkResult[];
}

interface TranscriptionResultsProps {
  results: ChunkResult[];
  isComplete: boolean;
  fileName: string;
}

export function TranscriptionResults({ results, isComplete, fileName }: TranscriptionResultsProps) {
  // We use primitive types for state to be extremely safe with React re-renders
  const [openChunkIdx, setOpenChunkIdx] = useState<number | null>(0);
  const [activeTabs, setActiveTabs] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-save logic to server
  useEffect(() => {
    const saveToServer = async () => {
      // Only save if completed and we have results
      if (isComplete && results.length > 0) {
        // Use a more unique session ID based on completion timestamp
        const finalSessionId = `session_${Date.now()}`;
        
        // Prevent duplicate saves in the same component lifecycle
        const existingSave = sessionStorage.getItem(`last_saved_${fileName}`);
        if (existingSave === results.length.toString()) return;

        const newSession = {
          id: Date.now().toString(),
          fileName,
          date: new Date().toLocaleString(),
          results: [...results] // Shallow copy to be safe
        };

        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSession),
          });

          if (res.ok) {
            sessionStorage.setItem(`last_saved_${fileName}`, results.length.toString());
            // Trigger sidebar refresh
            window.dispatchEvent(new Event('refresh-sessions'));
          }
        } catch (err) {
          console.error("Failed to auto-save session:", err);
        }
      }
    };

    saveToServer();
  }, [isComplete, results.length, fileName]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 mt-12 relative z-50">
      <SelectionFix />
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-primary" />
          Transcription Results
        </h2>
        
        <div className="flex gap-2">
          <Link 
            href="/history"
            className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <History size={16} />
            View History
          </Link>

          {isComplete && (
            <>
              <button 
                onClick={() => exportToMarkdown(results, fileName)}
                className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm font-semibold"
              >
                <FileText size={16} />
                Export
              </button>
              <button 
                onClick={exportToPDF}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-bold shadow-lg"
              >
                <Download size={16} />
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const idx = result.chunkIndex;
          const isOpen = openChunkIdx === idx;
          const currentTab = activeTabs[idx] || "sinhala";

          return (
            <div 
              key={`chunk-container-${idx}`}
              className={cn(
                "border rounded-2xl overflow-hidden bg-card transition-all",
                isOpen ? "border-primary shadow-lg" : "border-border"
              )}
            >
              {/* Header Button */}
              <button
                onClick={() => setOpenChunkIdx(isOpen ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-secondary/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    isOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">ලෙක්චර් කොටස {String(idx + 1).padStart(2, '0')}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock size={14} /> {formatTime(result.startOffset)} - {formatTime(result.endOffset)}
                    </p>
                  </div>
                </div>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
              </button>

              {/* Content - Pure CSS Display for reliability */}
              {isOpen && (
                <div className="border-t border-border bg-secondary/10 p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <div className="flex bg-secondary/50 p-1 rounded-xl">
                      <button
                        onClick={() => setActiveTabs(prev => ({ ...prev, [idx]: "sinhala" }))}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          currentTab === "sinhala" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        සිංහල සටහන
                      </button>
                      <button
                        onClick={() => setActiveTabs(prev => ({ ...prev, [idx]: "english" }))}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          currentTab === "english" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
                        )}
                      >
                        English Review
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        const prompt = encodeURIComponent(`Educational infographic for: ${result.data.quickSummary.substring(0, 100)}`);
                        window.open(`https://pollinations.ai/p/${prompt}?width=1024&height=1024&model=flux`, '_blank');
                      }}
                      className="ml-auto px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-2 text-sm font-bold"
                    >
                      <ImageIcon size={16} /> ඉන්ෆොග්‍රැෆික්
                    </button>
                  </div>

                  <div className="relative group">
                    <button
                      onClick={() => handleCopy(currentTab === "sinhala" ? result.data.translation : result.data.quickSummary, `copy-${idx}`)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      {copiedId === `copy-${idx}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    
                    <div className="lecture-content prose prose-sm dark:prose-invert max-w-none bg-background p-6 rounded-xl border border-border/50 shadow-inner whitespace-pre-wrap leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentTab === "sinhala" ? result.data.translation : result.data.quickSummary}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
