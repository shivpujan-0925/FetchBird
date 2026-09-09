import React, { useState } from "react";
import { ArrowRight, Clipboard, Link2, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function UrlInput({ onFetch, isLoading, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Validate YouTube URL
  const isValidYouTubeUrl = (testUrl: string): boolean => {
    if (!testUrl || testUrl.trim().length === 0) return false;
    try {
      const parsed = new URL(testUrl.trim());
      const host = parsed.hostname.toLowerCase();
      return (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com" ||
        host === "music.youtube.com" ||
        host === "youtu.be" ||
        host === "www.youtu.be"
      );
    } catch {
      return false;
    }
  };

  const isValid = isValidYouTubeUrl(url);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isValid && !isLoading && !disabled) {
      onFetch(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (isValidYouTubeUrl(text.trim())) {
          onFetch(text.trim());
        }
      }
    } catch {
      // Clipboard permission denied or unsupported
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    let droppedText = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (droppedText) {
      droppedText = droppedText.trim();
      setUrl(droppedText);
      if (isValidYouTubeUrl(droppedText)) {
        onFetch(droppedText);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all p-3 md:p-4 bg-card/60",
        isDragOver
          ? "border-primary bg-primary/5 ring-4 ring-primary/10"
          : "border-border/80 hover:border-border"
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative flex items-center">
          <div className="absolute left-3 text-muted-foreground pointer-events-none flex items-center">
            <Link2 className="h-4 w-4" />
          </div>

          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste or drop YouTube URL here..."
            disabled={isLoading || disabled}
            className="pl-9 pr-20 h-12 text-sm md:text-base border-input bg-background/80 shadow-none focus-visible:ring-primary font-mono tracking-tight placeholder:font-sans placeholder:tracking-normal"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {url && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setUrl("")}
                disabled={isLoading}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {!url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePaste}
                disabled={isLoading}
                className="h-8 px-2.5 text-xs font-sans text-muted-foreground hover:text-foreground flex items-center gap-1"
                title="Paste from clipboard"
              >
                <Clipboard className="h-3.5 w-3.5" />
                <span>Paste</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
            <span>Drop link or press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border">Enter</kbd></span>
          </div>

          <Button
            type="submit"
            disabled={!isValid || isLoading || disabled}
            className="h-9 px-4 text-xs md:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>Fetch Formats</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
