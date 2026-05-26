"use client";

import React, { useState, useCallback } from "react";
import { Upload, Music, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { ProgressBanner } from "./ProgressBanner";
import { TranscriptionResults } from "./TranscriptionResults";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export function AudioUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Transcription States
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [status, setStatus] = useState("Waiting for upload...");
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  
  // Compression States
  const [isCompressing, setIsCompressing] = useState(false);
  const ffmpegRef = React.useRef<any>(null);
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFile = (selectedFile: File) => {
    const allowedExtensions = [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".wma"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (selectedFile.type.startsWith("audio/") || allowedExtensions.includes(fileExt)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid audio file (.mp3, .m4a, .wav, .aac, .ogg, .wma).");
      setFile(null);
    }
    setIsDragging(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const loadFfmpeg = async () => {
    if (isFfmpegLoaded) return;
    
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
    const ffmpeg = ffmpegRef.current;
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    setIsFfmpegLoaded(true);
  };

  const startTranscription = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setIsComplete(false);
    setError(null);
    setProgress(0);
    setResults([]);
    setCurrentChunk(0);

    let finalFileToUpload: Blob = file;

    try {
      setIsCompressing(true);
      setStatus("Compressing audio for faster upload...");
      
      await loadFfmpeg();
      const ffmpeg = ffmpegRef.current;
      
      // Write file to memory with its original extension so FFmpeg recognizes it easily
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const inputFileName = `input${ext}`;
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));
      
      // Run compression/conversion: 64kbps, mono, always export to MP3 + Silence Truncation
      await ffmpeg.exec([
        "-i", inputFileName, 
        "-ac", "1", 
        "-ab", "64k", 
        "-af", "silenceremove=stop_periods=-1:stop_duration=1.5:stop_threshold=-45dB",
        "output.mp3"
      ]);
      
      // Read output and convert to Blob
      const data = await ffmpeg.readFile("output.mp3");
      finalFileToUpload = new Blob([data as any], { type: "audio/mpeg" });
      
      setStatus("Uploading and starting transcription...");
      setIsCompressing(false);
    } catch (compressError: any) {
      console.error("Compression Error:", compressError);
      // Fallback to original file if compression fails for some reason
      finalFileToUpload = file;
      setIsCompressing(false);
      setStatus("Starting transcription...");
    }

    const formData = new FormData();
    formData.append("file", finalFileToUpload, "compressed.mp3");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload = JSON.parse(line);
            
            if (payload.type === "status") {
              setStatus(payload.message);
              setProgress(payload.progress);
              setCurrentChunk(payload.currentChunk);
              setTotalChunks(payload.totalChunks);
            } else if (payload.type === "result") {
              setResults(prev => [...prev, payload]);
            } else if (payload.type === "error") {
              setError(`Error in chunk ${payload.chunkIndex + 1}: ${payload.message}`);
            }
          } catch (e) {
            console.error("Error parsing stream line:", e);
          }
        }
      }

      setIsComplete(true);
      setStatus("Everything finished!");
      setProgress(100);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    } finally {
      // We don't set isLoading(false) here because we want to keep the success view
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      {/* 1. Progress Section */}
      <ProgressBanner 
        status={status}
        progress={isCompressing ? 100 : progress}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
        isCompressing={isCompressing}
        isComplete={isComplete}
      />

      {/* 2. Upload Section (Hide when results start coming in) */}
      {!results.length && (
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center group overflow-hidden",
            isDragging 
              ? "border-primary bg-primary/5 scale-[1.02] shadow-2xl shadow-primary/10" 
              : "border-border bg-card hover:border-primary/50 hover:bg-secondary/30",
            file && "border-solid border-primary/30 bg-primary/5"
          )}
        >
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-br-full blur-3xl -translate-x-1/2 -translate-y-1/2 group-hover:bg-primary/10 transition-colors" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-tl-full blur-3xl translate-x-1/2 translate-y-1/2 group-hover:bg-primary/10 transition-colors" />

          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Upload size={32} className="text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Upload Lecture Audio</h3>
                <p className="text-muted-foreground mb-8 max-w-sm">
                  Drag and drop your audio file here (.mp3, .m4a, .wav, .aac, .ogg, .wma).
                </p>
                
                <label className="cursor-pointer">
                  <input type="file" accept="audio/*,.m4a,.wav,.mp3,.aac,.ogg,.wma" className="hidden" onChange={onFileInputChange} />
                  <span className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:translate-y-[-2px] transition-all">
                    Select File
                  </span>
                </label>
                
                {error && <p className="mt-4 text-destructive text-sm font-medium">{error}</p>}
              </motion.div>
            ) : (
              <motion.div 
                key="file"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-6 relative">
                  <Music size={40} className="text-primary" />
                  {!isLoading && (
                    <button onClick={() => setFile(null)} className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-secondary">
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <div className="mb-8 w-full max-w-md">
                  <p className="text-sm font-bold mb-2">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setFile(null)} disabled={isLoading} className="px-6 py-2.5 rounded-xl border border-border font-medium disabled:opacity-50">
                    Clear
                  </button>
                  <button onClick={startTranscription} disabled={isLoading} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2">
                    {isLoading ? <><Loader2 className="animate-spin" size={20} /> {isCompressing ? "Compressing..." : "Processing..."}</> : "Start Transcription"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. Results Section */}
      {results.length > 0 && (
        <TranscriptionResults 
          results={results} 
          isComplete={isComplete} 
          fileName={file?.name || "lecture"} 
        />
      )}
    </div>
  );
}
