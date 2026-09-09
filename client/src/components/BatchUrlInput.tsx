import React, { useState } from "react";
import { ArrowRight, Clipboard, Link2, Loader2, X, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BatchUrlInputProps {
  onInspect: (urls: string[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function BatchUrlInput({ onInspect, isLoading, disabled = false }: BatchUrlInputProps) {
  const [text, setText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Extract all valid YouTube URLs from text
  const extractUrls = (raw: string): string[] => {
    if (!raw) return [];
    // Split by newlines, spaces, or commas
    const tokens = raw.split(/[\r\n,\s]+/);
    const valid = new Set<string>();

    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;
      try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname.toLowerCase();
        if (
          host === "youtube.com" ||
          host === "www.youtube.com" ||
          host === "m.youtube.com" ||
          host === "music.youtube.com" ||
          host === "youtu.be" ||
          host === "www.youtu.be"
        ) {
          valid.add(trimmed);
        }
      } catch {
        // Not a URL
      }
    }
    return Array.from(valid);
  };

  const detectedUrls = extractUrls(text);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (detectedUrls.length > 0 && !isLoading && !disabled) {
      onInspect(detectedUrls);
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText((prev) => (prev ? `${prev}\n${clipText}` : clipText));
      }
    } catch {
      // ignore
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const dropped = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (dropped) {
      setText((prev) => (prev ? `${prev}\n${dropped}` : dropped));
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all p-4 bg-card/60",
        isDragOver
          ? "border-primary bg-primary/5 ring-4 ring-primary/10"
          : "border-border/80 hover:border-border"
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ListPlus className="h-4 w-4 text-primary" />
            <span>Paste Multiple Video URLs</span>
          </label>

          <div className="flex items-center gap-2">
            {detectedUrls.length > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                {detectedUrls.length} {detectedUrls.length === 1 ? "video" : "videos"} detected
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePaste}
              disabled={isLoading}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Clipboard className="h-3 w-3" />
              <span>Paste from clipboard</span>
            </Button>
            {text && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setText("")}
                disabled={isLoading}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\n(Paste up to 10 video links, one per line or comma-separated)`}
          disabled={isLoading || disabled}
          className="w-full rounded-md border border-input bg-background/80 p-3 text-xs md:text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y min-h-[90px]"
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground font-sans">
            Max 10 videos per batch. Concurrently downloaded via queue.
          </p>

          <Button
            type="submit"
            disabled={detectedUrls.length === 0 || isLoading || disabled}
            className="h-9 px-4 text-xs md:text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Inspecting {detectedUrls.length} videos...</span>
              </>
            ) : (
              <>
                <span>Inspect {detectedUrls.length > 0 ? `(${detectedUrls.length})` : ""} Videos</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
