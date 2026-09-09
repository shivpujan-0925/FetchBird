import React, { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles, Layers, ListChecks, HelpCircle, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  activeCount?: number;
  readyCount?: number;
  onOpenQueue?: () => void;
  activeTab: "single" | "batch";
  onTabChange: (tab: "single" | "batch") => void;
}

export function Navbar({
  activeCount = 0,
  readyCount = 0,
  onOpenQueue,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
              <path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
              <circle cx="8" cy="12" r="2" />
              <path d="m21 15-3-3 3-3" />
            </svg>
            <div className="absolute -inset-0.5 rounded-xl bg-primary/30 blur-sm -z-10 group-hover:opacity-100 opacity-50 transition-opacity" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-heading font-bold text-lg tracking-tight text-foreground">
                FetchBird
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                v1.2
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
              Local-first YouTube engine
            </span>
          </div>
        </a>

        {/* Center Nav Links / Mode Switcher */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border/50 text-xs font-medium">
          <button
            onClick={() => onTabChange("single")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "single"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Video
          </button>
          <button
            onClick={() => onTabChange("batch")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "batch"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Batch Mode</span>
            <span className="text-[10px] px-1 py-0.2 bg-primary/15 text-primary rounded font-mono">
              Multi
            </span>
          </button>
          <div className="h-4 w-px bg-border/60 mx-1" />
          <a
            href="#features"
            className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Workflow
          </a>
          <a
            href="#specs"
            className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Specs
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Active Queue pill indicator */}
          {(activeCount > 0 || readyCount > 0) && (
            <button
              onClick={onOpenQueue}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono transition-all bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 animate-pulse"
              title="View active downloads queue"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {activeCount > 0
                  ? `${activeCount} downloading`
                  : `${readyCount} ready`}
              </span>
            </button>
          )}

          <ThemeToggle />

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-9 w-9"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-xs">
            <button
              onClick={() => {
                onTabChange("single");
                setMobileMenuOpen(false);
              }}
              className={`py-2 rounded text-center ${
                activeTab === "single" ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              Single Video
            </button>
            <button
              onClick={() => {
                onTabChange("batch");
                setMobileMenuOpen(false);
              }}
              className={`py-2 rounded text-center flex items-center justify-center gap-1 ${
                activeTab === "batch" ? "bg-background font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              <span>Batch Mode</span>
              <span className="text-[9px] px-1 bg-primary/20 text-primary rounded">New</span>
            </button>
          </div>

          <div className="flex flex-col gap-1 text-sm pt-2 text-muted-foreground">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted text-foreground"
            >
              How It Works
            </a>
            <a
              href="#specs"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted text-foreground"
            >
              Formats & Specs
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
