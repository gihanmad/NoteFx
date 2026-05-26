"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, X, Maximize2, Minimize2, Trash2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/utils/cn";

interface Message {
  role: "user" | "model";
  parts: [{ text: string }];
}

export function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", parts: [{ text: input }] };
    const currentInput = input;
    setInput("");
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Extract contextual text from the generated notes to feed the AI
    const rawContext = Array.from(document.querySelectorAll('.prose')).map(el => el.textContent).join('\n').trim();
    const contextText = rawContext.slice(0, 6000); // Limit to keep prompt token size safely bound

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: currentInput,
          context: contextText,
          history: messages.slice(-6) // Keep last 3 turns for context
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to tutor.");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      // Add a placeholder message for the assistant
      setMessages(prev => [...prev, { role: "model", parts: [{ text: "" }] }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantText += chunk;
        
        // Update the last message in state
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            role: "model", 
            parts: [{ text: assistantText }] 
          };
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: "model", 
        parts: [{ text: "සමාවන්න, ටියුටර් සම්බන්ධ කර ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න." }] 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={cn(
        "relative h-full z-40 transition-all duration-300 border-l border-border bg-card shadow-2xl flex flex-col shrink-0",
        isOpen 
          ? (isExpanded ? "w-[600px] pointer-events-auto" : "w-96 pointer-events-auto") 
          : "w-0 border-none overflow-hidden pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary group">
            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-none">AI Academic Tutor</h3>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Online • Gemini 1.5 Flash</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            onClick={() => setMessages([])}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
             <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/30">
               <Bot size={40} />
             </div>
             <div>
               <h4 className="font-bold text-foreground">Ask Your Questions</h4>
               <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                 ටියුටර් සමඟ සිංහලෙන් හෝ ඉංග්‍රීසියෙන් සාකච්ඡා කරන්න. ඕනෑම කරුණක් ගැඹුරින් පැහැදිලි කරවා ගැනීමට අසන්න.
               </p>
             </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-primary"
            )}>
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn(
              "p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed",
              m.role === "user" 
                ? "bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10" 
                : "bg-secondary/50 text-foreground rounded-tl-none border border-border/50"
            )}>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/10">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.parts[0].text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-lg bg-card border border-border text-primary flex items-center justify-center">
               <Bot size={16} />
             </div>
             <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border/50 flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/50 backdrop-blur-md">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="ප්‍රශ්නය මෙතැන ටයිප් කරන්න..."
            className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none min-h-[50px] max-h-32"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Shift + Enter for new line • Advanced Academic Tutor
        </p>
      </div>

      {/* Toggle Button (Visible when closed) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ x: 100 }}
            animate={{ x: 0 }}
            exit={{ x: 100 }}
            onClick={() => setIsOpen(true)}
            className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50 group"
          >
            <Bot size={24} className="group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
