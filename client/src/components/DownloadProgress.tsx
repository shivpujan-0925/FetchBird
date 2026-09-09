import React from "react";
import {
  CheckCircle2,
  Download,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getFileDownloadUrl } from "@/lib/api";
import { ProgressState } from "@/hooks/useSocket";

interface DownloadProgressProps {
  jobId: string;
  progressData: ProgressState | null;
  onReset: () => void;
}

export function DownloadProgress({
  jobId,
  progressData,
  onReset,
}: DownloadProgressProps) {
  const status = progressData?.status || "pending";
  const progress = progressData?.progress ?? 0;
  const speed = progressData?.speed;
  const eta = progressData?.eta;
  const error = progressData?.error;

  const downloadUrl = getFileDownloadUrl(jobId);

  const getStatusDisplay = () => {
    switch (status) {
      case "pending":
        return {
          title: "Queued",
          description: "Waiting in download queue...",
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
        };
      case "downloading":
        return {
          title: `Downloading… ${progress}%`,
          description: speed ? `${speed} ${eta ? `· ETA ${eta}` : ""}` : "Fetching stream from YouTube...",
          icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
        };
      case "merging":
        return {
          title: "Merging audio and video…",
          description: "Muxing streams with FFmpeg into high-quality MP4...",
          icon: <Layers className="h-4 w-4 animate-pulse text-amber-500" />,
        };
      case "ready":
        return {
          title: "Ready to Download!",
          description: "Your file is ready to save to your local machine.",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        };
      case "failed":
        return {
          title: "Download Failed",
          description: error || "An unexpected error occurred during processing.",
          icon: <AlertCircle className="h-5 w-5 text-destructive" />,
        };
    }
  };

  const current = getStatusDisplay();

  return (
    <div className="space-y-5 p-5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/60 border border-border/50">
            {current.icon}
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              {current.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 font-sans">
              {current.description}
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-semibold text-muted-foreground px-2 py-1 rounded bg-muted/40 border border-border/40">
          {progress}%
        </span>
      </div>

      <Progress value={progress} className="h-2.5 transition-all duration-300" />

      {/* Ready Action: Big native download trigger */}
      {status === "ready" && (
        <div className="pt-2 space-y-3">
          <a
            href={downloadUrl}
            download
            className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all shadow-md active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            <span>Save to Local Machine</span>
          </a>

          <Button
            variant="ghost"
            onClick={onReset}
            className="w-full h-9 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Download another video</span>
          </Button>
        </div>
      )}

      {/* Failed Action */}
      {status === "failed" && (
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full h-10 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-destructive/30 hover:bg-destructive/10 text-destructive"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* In progress notice */}
      {(status === "pending" || status === "downloading" || status === "merging") && (
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary/70" />
            <span>Local worker active</span>
          </span>
          <span>In-memory Queue</span>
        </div>
      )}
    </div>
  );
}
