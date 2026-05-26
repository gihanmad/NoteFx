"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, Zap, CheckCircle2, Cpu } from "lucide-react";
import { cn } from "@/utils/cn";

interface ProgressBannerProps {
  currentChunk: number;
  totalChunks: number;
  progress: number;
  status: string;
  isProcessing?: boolean;
  isComplete?: boolean;
}

export function ProgressBanner({ currentChunk, totalChunks, progress, status, isProcessing, isComplete }: ProgressBannerProps) {
  if (currentChunk === 0 && !isProcessing && !isComplete) return null;

  return (
    <div className={cn(
      "w-full border rounded-3xl p-6 mb-12 shadow-2xl transition-all duration-700 overflow-hidden relative group",
      isComplete 
        ? "bg-green-500/5 border-green-500/20 shadow-green-500/5" 
        : "bg-primary/5 border-primary/20 shadow-primary/5"
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 text-primary/5 group-hover:text-primary/10 transition-transform duration-1000 group-hover:scale-110">
        {isComplete ? <CheckCircle2 size={120} strokeWidth={1} /> : <Cpu size={120} strokeWidth={1} />}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg transition-all duration-500",
            isComplete ? "bg-green-500 shadow-green-500/20 rotate-0" : "bg-primary shadow-primary/20"
          )}>
            {isComplete ? <CheckCircle2 size={28} /> : <Loader2 className="animate-spin" size={28} />}
          </div>
          <div>
            <h4 className="font-black text-xl tracking-tight leading-tight">
              {isComplete ? "Transcription Published!" : (isProcessing ? "AI Pre-Processing..." : "Academic Analysis Hub")}
            </h4>
            <p className={cn(
              "text-sm font-medium flex items-center gap-2 mt-1 transition-colors",
              isComplete ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
            )}>
              {!isComplete && <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />}
              {status}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md space-y-3">
          <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
            <span className={cn(isComplete ? "text-green-600" : "text-primary")}>
              {isProcessing ? "Local Intelligence" : (isComplete ? "Export Ready" : `Processing Segment ${currentChunk}/${totalChunks}`)}
            </span>
            <span className="tabular-nums">
              {isComplete ? "100% DONE" : `${progress}%`}
            </span>
          </div>
          <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/20">
            <motion.div 
              className={cn("h-full", isComplete ? "bg-green-500" : "bg-primary")}
              initial={{ width: 0 }}
              animate={{ width: `${isComplete ? 100 : progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground italic text-right">
            {isComplete ? "Notes are now permanently saved in your history" : "AI is currently expanding on lecture theories..."}
          </p>
        </div>
      </div>
    </div>
  );
}
