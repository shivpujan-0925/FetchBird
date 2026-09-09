import React from "react";
import { Clock, User, Film } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  channel?: string;
}

export function VideoCard({ title, thumbnail, duration, channel }: VideoCardProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-border/80 bg-card/50 backdrop-blur-sm overflow-hidden transition-all">
      <div className="relative shrink-0 w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-muted border border-border/60">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Film className="h-8 w-8 opacity-40" />
          </div>
        )}

        {duration > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-black/80 text-white backdrop-blur-xs flex items-center gap-1 shadow-sm">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </span>
        )}
      </div>

      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5 space-y-2">
        <div>
          <h4 className="font-medium text-sm sm:text-base line-clamp-2 text-foreground leading-snug">
            {title}
          </h4>
          {channel && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-sans">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{channel}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-[11px] font-mono font-normal">
            YouTube Video
          </Badge>
          {duration > 0 && (
            <Badge variant="secondary" className="text-[11px] font-mono font-normal">
              {formatDuration(duration)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
