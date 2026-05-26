"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface ProgressBannerProps {
  currentChunk: number;
  totalChunks: number;
  progress: number;
  status: string;
  isCompressing?: boolean;
  isComplete?: boolean;
}

export function ProgressBanner({ currentChunk, totalChunks, progress, status, isCompressing, isComplete }: ProgressBannerProps) {
  if (currentChunk === 0 && !isCompressing && !isComplete) return null;

  return (
    <div className="w-full bg-primary/5 border border-primary/20 rounded-3xl p-6 mb-12 shadow-2xl shadow-primary/5 overflow-hidden relative group">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-8 text-primary/5 group-hover:text-primary/10 transition-colors">
        <Zap size={120} strokeWidth={1} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg transition-colors duration-500",
            isComplete ? "bg-green-500 shadow-green-500/20" : "bg-primary shadow-primary/20"
          )}>
            {isComplete ? <CheckCircle2 size={24} /> : <Loader2 className="animate-spin" size={24} />}
          </div>
          <div>
            <h4 className="font-black text-xl tracking-tight">
              {isComplete ? "Transcription Complete!" : (isCompressing ? "Preparing Audio..." : "Processing Your Lecture...")}
            </h4>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
              {status}
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-primary">
              {isCompressing ? "Compressing File" : `Chunk ${currentChunk} of ${totalChunks}`}
            </span>
            <span className="tabular-nums">{isCompressing ? "Fast Upload" : `${progress}% complete`}</span>
          </div>
          <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
