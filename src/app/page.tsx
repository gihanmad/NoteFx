import React from "react";
import { AudioUpload } from "@/components/dashboard/AudioUpload";
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12 py-6">
      {/* Hero Section */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} />
          New: Advanced Transcription Engine
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight font-outfit">
           Good evening, <span className="text-primary italic">Gihan!</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Ready to turn those English lectures into perfect Sinhala notes? 
          Upload your audio below and let NoteFx handle the rest.
        </p>
      </section>

      {/* Upload Area */}
      <section className="relative group">
        {/* Animated accent gradient behind the upload area */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl -m-4 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <AudioUpload />
      </section>

      {/* Quick Actions / Recent Activity Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
            <PlayCircle size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2">Continue Session</h3>
          <p className="text-sm text-muted-foreground mb-4">You have a draft transcription for "Intro to Algorithms".</p>
          <button className="text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Open Editor <ArrowRight size={14} />
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
            <Sparkles size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2">Auto-Summarize</h3>
          <p className="text-sm text-muted-foreground mb-4">Generate key points from your last 5 transcribed lectures.</p>
          <button className="text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            Try Now <ArrowRight size={14} />
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
            <ArrowRight size={24} />
          </div>
          <h3 className="font-bold text-lg mb-2">Export Options</h3>
          <p className="text-sm text-muted-foreground mb-4">New templates added for PDF, Notion and Google Docs.</p>
          <button className="text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
            See More <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
