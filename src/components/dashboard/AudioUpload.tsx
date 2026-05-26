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
  
  // FFmpeg States
  const [isProcessing, setIsProcessing] = useState(false);
  const ffmpegRef = React.useRef<any>(null);
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);

  const handleFile = (selectedFile: File) => {
    const allowedExtensions = [".mp3", ".m4a", ".wav", ".aac", ".ogg", ".wma"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (selectedFile.type.startsWith("audio/") || allowedExtensions.includes(fileExt)) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid audio file.");
      setFile(null);
    }
    setIsDragging(false);
  };

  const loadFfmpeg = async () => {
    if (isFfmpegLoaded) return;
    if (!ffmpegRef.current) ffmpegRef.current = new FFmpeg();
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
    setIsProcessing(true);

    try {
      setStatus("Initializing AI Audio Engine...");
      await loadFfmpeg();
      const ffmpeg = ffmpegRef.current;
      
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const inputFileName = `input${ext}`;
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // Get Duration
      setStatus("Analyzing lecture duration...");
      // For duration we can use ffprobe-like command via ffmpeg
      // But a simpler way is to just use a small hack to get metadata
      // For now we'll assume 15 min chunks and let ffmpeg handle it

      // 1. Pre-process to a standard efficient format (MP3 64k Mono)
      setStatus("Optimizing audio for University AI (this saves data)...");
      await ffmpeg.exec([
        "-i", inputFileName, 
        "-ac", "1", 
        "-ab", "64k", 
        "optimized.mp3"
      ]);

      // 2. Client-side Chunking (15 minutes = 900 seconds)
      setStatus("Dividing lecture into 15-minute academic segments...");
      // Note: In a real production app we'd get duration programmatically.
      // Here we loop until we run out of audio.
      const CHUNK_SIZE = 15 * 60; // 900 seconds
      let chunks: Blob[] = [];
      let startTime = 0;
      let chunkIdx = 0;
      
      // We'll try to extract up to 10 chunks (150 mins) or until it fails
      while (startTime < 7200) { // Max 2 hours for safety
        const outputName = `chunk_${chunkIdx}.mp3`;
        try {
          const ret = await ffmpeg.exec([
            "-ss", startTime.toString(),
            "-t", CHUNK_SIZE.toString(),
            "-i", "optimized.mp3",
            "-acodec", "copy",
            outputName
          ]);
          
          const data = await ffmpeg.readFile(outputName);
          if (data.length < 1000) break; // End of file
          
          chunks.push(new Blob([data as any], { type: "audio/mpeg" }));
          startTime += (CHUNK_SIZE - 60); // 1-minute overlap
          chunkIdx++;
        } catch (e) {
          break;
        }
      }

      setTotalChunks(chunks.length);
      setIsProcessing(false);

      // 3. Sequential Processing (Serverless Friendly)
      let currentApiKeyIdx = 0;
      let accumulatedResults: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        setProgress(Math.round(((i) / chunks.length) * 100));
        setStatus(`Analyzing Segment ${i+1}: Theoretical Expansion in progress...`);

        const formData = new FormData();
        formData.append("file", chunks[i], `chunk_${i}.mp3`);
        formData.append("apiKeyIndex", currentApiKeyIdx.toString());

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`Failed to process chunk ${i+1}`);

        const result = await response.json();
        const payload = {
          type: "result",
          chunkIndex: i,
          startOffset: i * (CHUNK_SIZE - 60),
          endOffset: (i + 1) * CHUNK_SIZE,
          data: result.data
        };

        accumulatedResults.push(payload);
        setResults([...accumulatedResults]); // Update UI immediately
        currentApiKeyIdx = result.apiKeyIndex;
      }

      setIsComplete(true);
      setStatus("Lecture fully transcribed and expanded!");
      setProgress(100);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      <ProgressBanner 
        status={status}
        progress={progress}
        currentChunk={currentChunk}
        totalChunks={totalChunks}
        isProcessing={isProcessing}
        isComplete={isComplete}
      />

      {!results.length && (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center group overflow-hidden",
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-card hover:border-primary/50",
            file && "border-solid border-primary/30"
          )}
        >
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
                  <Upload size={32} className="text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Upload Lecture Audio</h3>
                <p className="text-muted-foreground mb-8">Drag and drop or select an audio file to start.</p>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0]!)} />
                  <span className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/25">Select File</span>
                </label>
                {error && <p className="mt-4 text-destructive font-medium">{error}</p>}
              </motion.div>
            ) : (
              <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 relative">
                  <Music size={32} className="text-primary" />
                  {!isLoading && <button onClick={() => setFile(null)} className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-background border flex items-center justify-center"><X size={14} /></button>}
                </div>
                <p className="font-bold mb-2">{file.name}</p>
                <p className="text-xs text-muted-foreground mb-8">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <div className="flex gap-4">
                  <button onClick={() => setFile(null)} disabled={isLoading} className="px-6 py-2.5 rounded-xl border font-medium">Clear</button>
                  <button onClick={startTranscription} disabled={isLoading} className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                    {isLoading ? <><Loader2 className="animate-spin" /> Processing...</> : "Start Transcription"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
