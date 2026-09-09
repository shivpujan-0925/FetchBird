import React from "react";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  Trash2,
  Film,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getFileDownloadUrl } from "@/lib/api";
import { useMultiSocket, ProgressState } from "@/hooks/useSocket";

export interface QueueJob {
  jobId: string;
  url: string;
  title: string;
  thumbnail?: string;
  formatId?: string;
  ext?: string;
  addedAt: number;
}

interface QueueManagerProps {
  jobs: QueueJob[];
  onClearJob: (jobId: string) => void;
  onClearAll: () => void;
}

export function QueueManager({ jobs, onClearJob, onClearAll }: QueueManagerProps) {
  const jobIds = jobs.map((j) => j.jobId);
  const { progressMap } = useMultiSocket(jobIds);

  if (jobs.length === 0) return null;

  const getJobStatus = (jobId: string): ProgressState => {
    return (
      progressMap[jobId] || {
        jobId,
        status: "pending",
        progress: 0,
      }
    );
  };

  const readyJobs = jobs.filter((j) => getJobStatus(j.jobId).status === "ready");
  const inProgressJobs = jobs.filter((j) => {
    const s = getJobStatus(j.jobId).status;
    return s === "downloading" || s === "merging" || s === "pending";
  });

  const handleDownloadAllReady = () => {
    readyJobs.forEach((job, idx) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = getFileDownloadUrl(job.jobId);
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 600); // Stagger by 600ms so browser triggers multiple downloads smoothly
    });
  };

  return (
    <section id="queue" className="w-full space-y-4 pt-6 animate-in fade-in-50 duration-300">
      {/* Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md">
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground flex items-center gap-2">
            <span>Download Queue</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
              {jobs.length} {jobs.length === 1 ? "item" : "items"}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {inProgressJobs.length > 0
              ? `${inProgressJobs.length} active in processing queue`
              : "All active downloads complete"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {readyJobs.length > 1 && (
            <Button
              size="sm"
              onClick={handleDownloadAllReady}
              className="h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save All Ready ({readyJobs.length})</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Queue</span>
          </Button>
        </div>
      </div>

      {/* Queue items list */}
      <div className="space-y-3">
        {jobs.map((job) => {
          const state = getJobStatus(job.jobId);
          const status = state.status;
          const progress = state.progress;
          const speed = state.speed;
          const eta = state.eta;
          const downloadUrl = getFileDownloadUrl(job.jobId);

          const isVideo =
            job.ext === "mp4" ||
            Boolean(job.formatId?.includes("bestvideo")) ||
            Boolean(job.formatId?.includes("direct")) ||
            (!job.formatId?.toLowerCase().includes("audio") && job.ext !== "mp3");

          return (
            <div
              key={job.jobId}
              className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-3 transition-all hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Thumbnail + Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-muted border border-border/60 shrink-0">
                    {job.thumbnail ? (
                      <img
                        src={job.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Film className="h-4 w-4 opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-xs sm:text-sm text-foreground truncate">
                      {job.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                      <span className="px-1.5 py-0.2 rounded bg-muted border border-border text-[10px] uppercase font-semibold">
                        {isVideo ? "MP4 Video" : "MP3 Audio"}
                      </span>
                      {speed && <span>· {speed}</span>}
                      {eta && <span>· ETA {eta}</span>}
                    </div>
                  </div>
                </div>

                {/* Right Status Badge / Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {status === "ready" ? (
                    <a
                      href={downloadUrl}
                      download
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 transition-all shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Save File</span>
                    </a>
                  ) : status === "merging" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-500 font-medium px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                      <Layers className="h-3.5 w-3.5 animate-pulse" />
                      <span>Merging FFmpeg...</span>
                    </span>
                  ) : status === "downloading" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-primary font-medium px-2 py-1 rounded bg-primary/10 border border-primary/20">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{progress}%</span>
                    </span>
                  ) : status === "failed" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-destructive font-medium px-2 py-1 rounded bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Failed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground px-2 py-1 rounded bg-muted/60 border border-border/40">
                      <Loader2 className="h-3.5 w-3.5 animate-spin opacity-50" />
                      <span>Queued</span>
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onClearJob(job.jobId)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Dismiss"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <Progress
                  value={status === "merging" ? 95 : status === "ready" ? 100 : progress}
                  className="h-2"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
