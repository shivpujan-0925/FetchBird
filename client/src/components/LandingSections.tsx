import React from "react";
import {
  Sparkles,
  Layers,
  Zap,
  HardDrive,
  Music,
  CheckCircle2,
  ShieldCheck,
  Video,
  Clock,
  Cpu,
  Download,
  Terminal,
} from "lucide-react";

export function LandingSections() {
  const features = [
    {
      icon: <Layers className="h-5 w-5 text-primary" />,
      title: "Full HD & 4K Remuxing",
      description:
        "Automatically merges separate high-bitrate video and pristine audio streams into broadcast-standard MP4 files with zero quality degradation.",
      badge: "FFmpeg Powered",
    },
    {
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      title: "Concurrent Batch Downloads",
      description:
        "Queue multiple video links at once. Our in-memory worker queue intelligently manages download concurrency to maximize bandwidth without CPU bottlenecks.",
      badge: "p-queue Engine",
    },
    {
      icon: <Music className="h-5 w-5 text-emerald-500" />,
      title: "Lossless MP3 Audio Extraction",
      description:
        "Strip and transcode YouTube audio directly into high-fidelity MP3 or M4A format, perfect for offline listening, lectures, and background audio.",
      badge: "Clean Audio",
    },
    {
      icon: <HardDrive className="h-5 w-5 text-blue-500" />,
      title: "Local-First & Auto Sweep",
      description:
        "Runs entirely on your local machine with automated 15-minute TTL storage sweeps. No cloud intermediaries, no tracking, and zero ads.",
      badge: "Privacy First",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Paste or Drop Links",
      description:
        "Input a single link or switch to Batch Mode to paste multiple links. Supports youtube.com, youtu.be, shorts, and live archives.",
    },
    {
      num: "02",
      title: "Select Formats & Presets",
      description:
        "Pick crisp 1080p, 720p, or Studio MP3 audio. Use global bulk presets to configure your entire batch in a single click.",
    },
    {
      num: "03",
      title: "Stream, Mux & Save",
      description:
        "Track live Socket.IO progress bars, download speeds, and FFmpeg remuxing in real-time. Save files directly to your device with native browser dialogs.",
    },
  ];

  const specs = [
    { resolution: "1080p Full HD", container: "MP4", videoCodec: "H.264 / AV1", audioCodec: "AAC / Opus", muxing: "Yes (FFmpeg)" },
    { resolution: "720p HD", container: "MP4", videoCodec: "H.264", audioCodec: "AAC", muxing: "Yes (FFmpeg)" },
    { resolution: "480p SD", container: "MP4", videoCodec: "H.264", audioCodec: "AAC", muxing: "Yes (FFmpeg)" },
    { resolution: "360p Fast", container: "MP4", videoCodec: "H.264", audioCodec: "AAC", muxing: "Direct / Muxed" },
    { resolution: "Audio Only", container: "MP3", videoCodec: "None", audioCodec: "MP3 320kbps", muxing: "Transcoded" },
  ];

  return (
    <div className="w-full space-y-20 pt-16">
      {/* Features Section */}
      <section id="features" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Engine Highlights</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            Engineered for speed, privacy, and media fidelity
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Built on top of modern web standards, lightweight concurrency queues, and industry-grade media processing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-3 hover:border-primary/40 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-muted/80 border border-border/60 group-hover:scale-105 transition-transform">
                  {feature.icon}
                </div>
                <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border/50">
                  {feature.badge}
                </span>
              </div>
              <h4 className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Timeline */}
      <section id="how-it-works" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-secondary text-secondary-foreground border border-border">
            <Cpu className="h-3.5 w-3.5" />
            <span>Workflow</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            From link to local file in three steps
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative p-6 rounded-2xl border border-border/80 bg-card/50 backdrop-blur-sm space-y-3"
            >
              <div className="text-2xl font-mono font-bold text-primary/70">
                {step.num}
              </div>
              <h4 className="font-heading font-semibold text-base text-foreground">
                {step.title}
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Formats & Specs Matrix */}
      <section id="specs" className="space-y-6 scroll-mt-20">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-muted text-muted-foreground border border-border">
            <Terminal className="h-3.5 w-3.5" />
            <span>Technical Matrix</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            Supported Qualities & Codecs
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Resolution</th>
                <th className="p-4">Container</th>
                <th className="p-4">Video Stream</th>
                <th className="p-4">Audio Stream</th>
                <th className="p-4">Muxing Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-mono text-xs">
              {specs.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                    {row.container === "MP3" ? (
                      <Music className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <span>{row.resolution}</span>
                  </td>
                  <td className="p-4 text-muted-foreground font-bold">{row.container}</td>
                  <td className="p-4 text-muted-foreground">{row.videoCodec}</td>
                  <td className="p-4 text-muted-foreground">{row.audioCodec}</td>
                  <td className="p-4 text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-muted border border-border text-[10px]">
                      {row.muxing}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
