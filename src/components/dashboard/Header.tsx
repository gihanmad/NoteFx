"use client";

import React from "react";
import { Bell, User, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
         {/* Title area replaced search */}
         <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Workspace / Current Lecture</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-secondary transition-colors relative text-muted-foreground">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
        </button>
        
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground group"
        >
          <Sun size={20} className="hidden dark:block group-hover:rotate-45 transition-transform" />
          <Moon size={20} className="block dark:hidden group-hover:-rotate-12 transition-transform" />
        </button>

        <div className="h-8 w-[1px] bg-border mx-2" />

        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-secondary transition-colors group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">Gihan Wanasooriya</p>
            <p className="text-xs text-muted-foreground mt-1">Pro Plan</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary/60 border border-border flex items-center justify-center text-primary-foreground font-semibold">
            GW
          </div>
        </button>
      </div>
    </header>
  );
}
