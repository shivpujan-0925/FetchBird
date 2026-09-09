import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import YTDlpWrapModule from "yt-dlp-wrap";
import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";

// Handle default export across ESM/CJS
const YTDlpWrap = (YTDlpWrapModule as any).default || YTDlpWrapModule;

const rawFfmpeg = (ffmpegStatic as any)?.default || ffmpegStatic;
const ffmpegPath: string | null = typeof rawFfmpeg === "string" ? rawFfmpeg : null;

// Set fluent-ffmpeg binary path if available
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const BIN_DIR = path.resolve(process.cwd(), "bin");
const BIN_FILE = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const LOCAL_BIN_PATH = path.join(BIN_DIR, BIN_FILE);

let ytDlpInstance: InstanceType<typeof YTDlpWrap> | null = null;

export async function getYtDlp(): Promise<InstanceType<typeof YTDlpWrap>> {
  if (ytDlpInstance) {
    return ytDlpInstance;
  }

  // 1. Check if yt-dlp is in PATH
  let inPath = false;
  try {
    const cmd = process.platform === "win32" ? "where yt-dlp" : "which yt-dlp";
    execSync(cmd, { stdio: "ignore" });
    inPath = true;
  } catch {
    inPath = false;
  }

  if (inPath) {
    console.log("[yt-dlp] Using system-installed yt-dlp binary from PATH");
    ytDlpInstance = new YTDlpWrap();
    return ytDlpInstance;
  }

  // 2. Check if local binary exists in server/bin/
  if (fs.existsSync(LOCAL_BIN_PATH)) {
    console.log(`[yt-dlp] Using local binary at ${LOCAL_BIN_PATH}`);
    ytDlpInstance = new YTDlpWrap(LOCAL_BIN_PATH);
    return ytDlpInstance;
  }

  // 3. Auto-download binary from GitHub if missing
  console.log(`[yt-dlp] Binary not found. Auto-downloading latest release to ${LOCAL_BIN_PATH}...`);
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  try {
    await YTDlpWrap.downloadFromGithub(LOCAL_BIN_PATH);
    if (process.platform !== "win32") {
      fs.chmodSync(LOCAL_BIN_PATH, 0o755);
    }
    console.log(`[yt-dlp] Successfully downloaded yt-dlp binary to ${LOCAL_BIN_PATH}`);
    ytDlpInstance = new YTDlpWrap(LOCAL_BIN_PATH);
    return ytDlpInstance;
  } catch (err: any) {
    console.error(`[yt-dlp] Failed to download binary:`, err.message);
    // Fallback attempt with default constructor
    ytDlpInstance = new YTDlpWrap();
    return ytDlpInstance;
  }
}

export interface VideoFormatOption {
  formatId: string;
  resolution: string;
  ext: string;
  hasAudio: boolean;
  filesize?: number;
  note?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel?: string;
  formats: VideoFormatOption[];
}

export async function fetchInfo(url: string): Promise<VideoMetadata> {
  const yt = await getYtDlp();
  const stdout = await yt.execPromise([
    url,
    "--dump-json",
    "--no-playlist",
    "--no-warnings",
    "--js-runtimes",
    "node",
  ]);
  const raw = JSON.parse(stdout);

  const maxDuration = Number(process.env.MAX_VIDEO_DURATION_SECONDS ?? 21600);
  if (maxDuration > 0 && raw.duration && raw.duration > maxDuration) {
    throw new Error(
      `Video duration (${Math.round(raw.duration / 60)} min) exceeds maximum allowed duration (${Math.round(
        maxDuration / 60
      )} min)`
    );
  }

  // Curate available resolutions cleanly
  const rawFormats = raw.formats || [];
  const optionsMap = new Map<string, VideoFormatOption>();

  // Helper to extract height
  const standardHeights = [1080, 720, 480, 360];

  for (const h of standardHeights) {
    // Check if any stream has this height
    const hasHeight = rawFormats.some((f: any) => f.height === h);
    if (hasHeight) {
      optionsMap.set(`${h}p`, {
        formatId: `bestvideo[height<=${h}]+bestaudio/best[height<=${h}]/best`,
        resolution: `${h}p`,
        ext: "mp4",
        hasAudio: true,
        note: h >= 1080 ? "Full HD (Muxed)" : h === 720 ? "HD (Muxed)" : "SD (Muxed)",
      });
    }
  }

  // Add Best Audio (MP3)
  optionsMap.set("audio-mp3", {
    formatId: "bestaudio/best",
    resolution: "Audio Only (MP3)",
    ext: "mp3",
    hasAudio: true,
    note: "High Quality Audio",
  });

  // Also include direct progressive formats if found (e.g., format 18, 22)
  for (const f of rawFormats) {
    if (f.vcodec !== "none" && f.acodec !== "none" && f.height) {
      const key = `direct-${f.height}p`;
      if (!optionsMap.has(key)) {
        optionsMap.set(key, {
          formatId: f.format_id,
          resolution: `${f.height}p (Fast Direct)`,
          ext: f.ext || "mp4",
          hasAudio: true,
          filesize: f.filesize || f.filesize_approx,
          note: "Direct stream, no muxing",
        });
      }
    }
  }

  // If no standard options matched, fallback to raw formats
  if (optionsMap.size <= 1) {
    for (const f of rawFormats.slice(-6)) {
      if (f.vcodec !== "none" || f.acodec !== "none") {
        optionsMap.set(f.format_id, {
          formatId: f.format_id,
          resolution: f.resolution || (f.height ? `${f.height}p` : "Audio"),
          ext: f.ext || "mp4",
          hasAudio: f.acodec !== "none",
          filesize: f.filesize || f.filesize_approx,
        });
      }
    }
  }

  const formats = Array.from(optionsMap.values());

  return {
    id: raw.id,
    title: raw.title || "YouTube Video",
    thumbnail: raw.thumbnail || (raw.thumbnails && raw.thumbnails[0]?.url) || "",
    duration: raw.duration || 0,
    channel: raw.channel || raw.uploader || "",
    formats,
  };
}

export async function downloadToFile(
  url: string,
  formatId: string,
  outPath: string,
  onProgress: (percent: number, speed?: string, eta?: string) => void,
  onStatusChange: (status: "downloading" | "merging" | "ready") => void
): Promise<string> {
  const yt = await getYtDlp();

  // Ensure output directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const isAudioOnly =
    !formatId.includes("bestvideo") &&
    !formatId.includes("direct") &&
    (formatId === "bestaudio/best" ||
      formatId === "bestaudio" ||
      formatId === "audio-mp3" ||
      (!formatId.match(/^\d+$/) && outPath.toLowerCase().endsWith(".mp3")));

  const args: string[] = [url];

  if (isAudioOnly) {
    args.push(
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0"
    );
  } else {
    args.push(
      "-f",
      formatId,
      "--merge-output-format",
      "mp4"
    );
  }

  if (ffmpegPath) {
    args.push("--ffmpeg-location", ffmpegPath);
  }

  // Use template path to allow ffmpeg to write directly to target without Windows lock collisions
  const outParsed = path.parse(outPath);
  const templatePath = path.join(outParsed.dir, `${outParsed.name}.%(ext)s`);

  args.push(
    "-o",
    templatePath,
    "--no-playlist",
    "--no-warnings",
    "--newline",
    "--js-runtimes",
    "node",
    "--windows-filenames",
    "--file-access-retries",
    "10",
    "--no-mtime"
  );

  return new Promise<string>((resolve, reject) => {
    onStatusChange("downloading");

    const ytProc = yt.exec(args);

    ytProc.on("progress", (progress: any) => {
      const pct = Math.min(100, Math.max(0, Math.round(progress.percent || 0)));
      onProgress(pct, progress.currentSpeed, progress.eta);
    });

    ytProc.on("ytDlpEvent", (eventType: string, eventData: string) => {
      const dataLower = (eventData || "").toLowerCase();
      if (
        dataLower.includes("merging") ||
        dataLower.includes("merger") ||
        dataLower.includes("extractaudio") ||
        dataLower.includes("post-process")
      ) {
        onStatusChange("merging");
      }
    });

    if (ytProc.ytDlpProcess?.stdout) {
      ytProc.ytDlpProcess.stdout.on("data", (data: Buffer) => {
        const str = data.toString();
        // Catch [download] 100% or [Merger]
        if (str.includes("[Merger]") || str.includes("[ExtractAudio]") || str.includes("Post-process")) {
          onStatusChange("merging");
        }
        // Match percentage if yt-dlp-wrap progress event misses
        const match = str.match(/(\d{1,3}(?:\.\d+)?)%/);
        if (match) {
          const pct = Math.min(100, Math.max(0, Math.round(parseFloat(match[1]))));
          onProgress(pct);
        }
      });
    }

    ytProc.on("error", (err: Error) => {
      console.error("[yt-dlp] Process error:", err);
      reject(err);
    });

    ytProc.on("close", async () => {
      let finalPath = outPath;

      // If target file doesn't exist directly, check for possible extensions or temp
      if (!fs.existsSync(finalPath)) {
        const candidates = [
          path.join(outParsed.dir, `${outParsed.name}.mp4`),
          path.join(outParsed.dir, `${outParsed.name}.mp3`),
          path.join(outParsed.dir, `${outParsed.name}.mkv`),
          path.join(outParsed.dir, `${outParsed.name}.webm`),
          path.join(outParsed.dir, `${outParsed.name}.temp${outParsed.ext}`),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            finalPath = candidate;
            break;
          }
        }
      }

      onStatusChange("ready");
      resolve(finalPath);
    });
  });
}
