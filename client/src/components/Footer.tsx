import { ShieldCheck, HardDrive, Cpu } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/70 bg-card/40 backdrop-blur-sm mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                F
              </div>
              <span className="font-heading font-bold text-base tracking-tight text-foreground">
                FetchBird
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              A high-performance, local-first YouTube media downloader and remuxing tool.
              Downloads raw streams directly to your machine and muxes high-bitrate audio and video with FFmpeg.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
                <span>Zero Cloud Retention</span>
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-primary" />
                <span>Multi-Core Muxing</span>
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a href="#downloader" className="hover:text-foreground transition-colors">
                  Single Downloader
                </a>
              </li>
              <li>
                <a href="#downloader" className="hover:text-foreground transition-colors">
                  Batch Downloader
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Key Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  Remuxing Pipeline
                </a>
              </li>
              <li>
                <a href="#specs" className="hover:text-foreground transition-colors">
                  Format Specifications
                </a>
              </li>
            </ul>
          </div>

          {/* Legal / Archiving Notice */}
          <div className="space-y-2">
            <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Personal Archiving</span>
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              FetchBird is designed as a personal utility for downloading content you have rights to, including your own uploads, public domain, and Creative Commons videos. Always respect YouTube's Terms of Service and creators' rights.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground font-sans">
            FetchBird &copy; {new Date().getFullYear()} — Local-first media utility.
          </p>
        </div>
      </div>
    </footer>
  );
}
