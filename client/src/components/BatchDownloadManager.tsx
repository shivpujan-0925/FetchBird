import React, { useState } from "react";
import { Download, Film, Music, Trash2, ArrowLeft, Video, CheckCircle } from "lucide-react";
import { BatchInfoItem, BatchDownloadItem } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BatchDownloadManagerProps {
  items: BatchInfoItem[];
  onStartDownload: (downloadItems: BatchDownloadItem[]) => void;
  onCancel: () => void;
  isStarting: boolean;
}

export function BatchDownloadManager({
  items,
  onStartDownload,
  onCancel,
  isStarting,
}: BatchDownloadManagerProps) {
  // Map of URL -> selected formatId
  const [selectedFormats, setSelectedFormats] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    items.forEach((item) => {
      if (item.success && item.info?.formats && item.info.formats.length > 0) {
        initial[item.url] = item.info.formats[0].formatId;
      }
    });
    return initial;
  });

  const [activeItems, setActiveItems] = useState<BatchInfoItem[]>(items);

  const handleFormatChange = (url: string, formatId: string) => {
    setSelectedFormats((prev) => ({ ...prev, [url]: formatId }));
  };

  const handleRemove = (url: string) => {
    setActiveItems((prev) => prev.filter((i) => i.url !== url));
  };

  const setAllFormats = (targetResolution: "1080p" | "720p" | "mp3") => {
    setSelectedFormats((prev) => {
      const next = { ...prev };
      activeItems.forEach((item) => {
        if (!item.success || !item.info?.formats) return;
        if (targetResolution === "mp3") {
          const audioFormat = item.info.formats.find(
            (f) =>
              f.formatId === "bestaudio/best" ||
              f.formatId === "bestaudio" ||
              f.formatId === "audio-mp3" ||
              f.resolution.toLowerCase().includes("audio") ||
              (f.ext === "mp3" && !f.formatId.includes("bestvideo"))
          );
          if (audioFormat) next[item.url] = audioFormat.formatId;
        } else {
          const match =
            item.info.formats.find((f) => f.resolution.includes(targetResolution)) ||
            item.info.formats[0];
          if (match) next[item.url] = match.formatId;
        }
      });
      return next;
    });
  };

  const handleTrigger = () => {
    const downloadPayload: BatchDownloadItem[] = activeItems
      .filter((i) => i.success && i.info)
      .map((item) => {
        const formatId = selectedFormats[item.url] || item.info?.formats[0]?.formatId || "best";
        const selectedOption = item.info?.formats.find((f) => f.formatId === formatId);
        const isAudio =
          formatId === "bestaudio/best" ||
          formatId === "bestaudio" ||
          formatId === "audio-mp3" ||
          (!formatId.includes("bestvideo") && !formatId.includes("direct") && formatId.includes("audio")) ||
          Boolean(selectedOption?.resolution.toLowerCase().includes("audio")) ||
          (selectedOption?.ext === "mp3" && !selectedOption?.resolution.includes("p"));

        return {
          url: item.url,
          formatId,
          title: item.info?.title || "Video",
          thumbnail: item.info?.thumbnail,
          ext: isAudio ? "mp3" : "mp4",
        };
      });

    if (downloadPayload.length > 0) {
      onStartDownload(downloadPayload);
    }
  };

  const validCount = activeItems.filter((i) => i.success).length;

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-300">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isStarting}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Edit URL List</span>
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            {validCount} ready for queue
          </span>
        </div>

        {/* Global Bulk Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground text-[11px] mr-1">Set All:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllFormats("1080p")}
            className="h-7 px-2 text-[11px] font-mono"
          >
            1080p
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllFormats("720p")}
            className="h-7 px-2 text-[11px] font-mono"
          >
            720p
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllFormats("mp3")}
            className="h-7 px-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400"
          >
            MP3 Audio
          </Button>
        </div>
      </div>

      {/* Inspected items list */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {activeItems.map((item, index) => {
          if (!item.success || !item.info) {
            return (
              <div
                key={item.url + index}
                className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="truncate">
                  <span className="font-mono text-[11px] text-muted-foreground block truncate">
                    {item.url}
                  </span>
                  <span className="text-destructive font-medium">
                    {item.error || "Failed to fetch info"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.url)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }

          const currentFormatId = selectedFormats[item.url] || item.info.formats[0]?.formatId;

          return (
            <div
              key={item.url + index}
              className="p-3 rounded-xl border border-border/80 bg-card/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-border"
            >
              {/* Thumbnail + Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative h-12 w-20 rounded-md overflow-hidden bg-muted shrink-0 border border-border/60">
                  {item.info.thumbnail ? (
                    <img
                      src={item.info.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <Film className="h-4 w-4 opacity-40" />
                    </div>
                  )}
                  {item.info.duration > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 text-[9px] font-mono rounded bg-black/80 text-white">
                      {formatDuration(item.info.duration)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h5 className="font-medium text-xs sm:text-sm text-foreground truncate">
                    {item.info.title}
                  </h5>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.info.channel || "YouTube"}
                  </p>
                </div>
              </div>

              {/* Format dropdown & remove */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <Select
                  value={currentFormatId}
                  onValueChange={(val) => handleFormatChange(item.url, val)}
                >
                  <SelectTrigger className="h-8 text-xs font-mono w-[150px] bg-background/80">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent className="text-xs font-mono">
                    {item.info.formats.map((f) => (
                      <SelectItem key={f.formatId} value={f.formatId}>
                        <span className="flex items-center gap-1.5">
                          {f.resolution.toLowerCase().includes("audio") ? (
                            <Music className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Video className="h-3 w-3 text-primary" />
                          )}
                          <span>{f.resolution}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.url)}
                  disabled={isStarting}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  title="Remove from batch"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Download Trigger */}
      <Button
        onClick={handleTrigger}
        disabled={validCount === 0 || isStarting}
        className="w-full h-11 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span>
          {isStarting
            ? "Scheduling Batch Downloads..."
            : `Start Batch Download (${validCount} ${validCount === 1 ? "video" : "videos"})`}
        </span>
      </Button>
    </div>
  );
}
