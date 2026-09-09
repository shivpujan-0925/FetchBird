import React from "react";
import { Download, Music, Video, Sparkles } from "lucide-react";
import { VideoFormatOption } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface FormatSelectorProps {
  formats: VideoFormatOption[];
  selectedFormatId: string;
  onSelectFormat: (formatId: string) => void;
  onDownload: () => void;
  isStarting: boolean;
}

export function FormatSelector({
  formats,
  selectedFormatId,
  onSelectFormat,
  onDownload,
  isStarting,
}: FormatSelectorProps) {
  const selectedFormat = formats.find((f) => f.formatId === selectedFormatId) || formats[0];

  const videoFormats = formats.filter((f) => !f.resolution.toLowerCase().includes("audio"));
  const audioFormats = formats.filter((f) => f.resolution.toLowerCase().includes("audio"));

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>Select Quality & Format</span>
          {selectedFormat?.note && (
            <span className="text-[11px] text-primary/90 font-mono font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {selectedFormat.note}
            </span>
          )}
        </label>

        <Select value={selectedFormatId} onValueChange={onSelectFormat}>
          <SelectTrigger className="w-full font-mono text-xs md:text-sm h-11 bg-background/80">
            <SelectValue placeholder="Select quality..." />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs">
            {videoFormats.length > 0 && (
              <SelectGroup>
                <SelectLabel className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground">
                  Video (MP4)
                </SelectLabel>
                {videoFormats.map((f) => (
                  <SelectItem key={f.formatId} value={f.formatId}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="flex items-center gap-2 font-medium">
                        <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{f.resolution}</span>
                      </span>
                      <span className="text-muted-foreground text-[11px] flex items-center gap-2">
                        {f.filesize ? formatBytes(f.filesize) : ""}
                        <span className="uppercase font-semibold text-[10px] px-1 py-0.2 bg-muted rounded border border-border">
                          {f.ext}
                        </span>
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {audioFormats.length > 0 && (
              <SelectGroup>
                <SelectLabel className="font-sans text-[11px] uppercase tracking-wider text-muted-foreground pt-2">
                  Audio Only
                </SelectLabel>
                {audioFormats.map((f) => (
                  <SelectItem key={f.formatId} value={f.formatId}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="flex items-center gap-2 font-medium">
                        <Music className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{f.resolution}</span>
                      </span>
                      <span className="text-muted-foreground text-[11px] flex items-center gap-2">
                        {f.filesize ? formatBytes(f.filesize) : ""}
                        <span className="uppercase font-semibold text-[10px] px-1 py-0.2 bg-muted rounded border border-border">
                          {f.ext}
                        </span>
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onDownload}
        disabled={isStarting || !selectedFormatId}
        className="w-full h-11 text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span>{isStarting ? "Queuing Download..." : "Start Download"}</span>
      </Button>
    </div>
  );
}
