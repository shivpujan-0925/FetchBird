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

export interface CookieResolution {
  path: string | null;
  source: "env-content" | "env-path" | "render-secret" | "local-file" | "none";
}

let cachedCookiesPath: string | null = null;
let cachedCookieSource: CookieResolution["source"] = "none";

/**
 * Resolves YouTube cookies location from Render secret files, environment variables, or local files.
 */
export function resolveCookies(): CookieResolution {
  // 1. Explicit path from env
  const envPath = process.env.COOKIES_PATH || process.env.YOUTUBE_COOKIES_PATH;
  if (envPath && fs.existsSync(envPath)) {
    cachedCookiesPath = path.resolve(envPath);
    cachedCookieSource = "env-path";
    return { path: cachedCookiesPath, source: cachedCookieSource };
  }

  // 2. Render secret file standard mount point (/etc/secrets/cookies.txt)
  const renderSecretPath = "/etc/secrets/cookies.txt";
  if (fs.existsSync(renderSecretPath)) {
    cachedCookiesPath = renderSecretPath;
    cachedCookieSource = "render-secret";
    return { path: cachedCookiesPath, source: cachedCookieSource };
  }

  // 3. Local file in project root, server directory, or parent directory
  const localCandidates = [
    path.resolve(process.cwd(), "cookies.txt"),
    path.resolve(process.cwd(), "server", "cookies.txt"),
    path.resolve(process.cwd(), "..", "cookies.txt"),
  ];
  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      cachedCookiesPath = candidate;
      cachedCookieSource = "local-file";
      return { path: cachedCookiesPath, source: cachedCookieSource };
    }
  }

  // 4. Raw cookie content passed via environment variable (e.g. on Render)
  // Supports raw Netscape format or Base64-encoded string
  const rawCookieEnv = process.env.YOUTUBE_COOKIES || process.env.COOKIES_CONTENT;
  if (rawCookieEnv && rawCookieEnv.trim()) {
    try {
      let content = rawCookieEnv.trim();
      // If base64 encoded (does not contain tabs or newlines and decodes to cookie text)
      if (!content.includes("\n") && !content.includes("\t") && content.length > 50) {
        try {
          const decoded = Buffer.from(content, "base64").toString("utf-8");
          if (decoded.includes("# Netscape") || decoded.includes(".youtube.com") || decoded.includes("\t")) {
            content = decoded;
          }
        } catch {
          // Keep raw content
        }
      }

      const tempDir = path.resolve(process.env.TEMP_DIR || "./tmp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const targetFile = path.join(tempDir, "youtube_cookies.txt");
      fs.writeFileSync(targetFile, content, { encoding: "utf-8", mode: 0o600 });
      cachedCookiesPath = targetFile;
      cachedCookieSource = "env-content";
      return { path: cachedCookiesPath, source: cachedCookieSource };
    } catch (err) {
      console.error("[yt-dlp] Failed to write YOUTUBE_COOKIES env to file:", err);
    }
  }

  return { path: null, source: "none" };
}

/**
 * Returns common arguments for all yt-dlp executions, including cookies, proxies, and extractor args.
 */
export function getCommonYtDlpArgs(): string[] {
  const extraArgs: string[] = [];

  // 1. YouTube Cookies
  const cookieInfo = resolveCookies();
  if (cookieInfo.path) {
    extraArgs.push("--cookies", cookieInfo.path);
  }

  // 2. HTTP/HTTPS/SOCKS5 Proxy support
  const proxyUrl =
    process.env.PROXY_URL ||
    process.env.YTDLP_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;
  if (proxyUrl) {
    extraArgs.push("--proxy", proxyUrl);
  }

  // 3. Extractor arguments (fallback to player clients that minimize bot detection challenges)
  const extractorArgs =
    process.env.YTDLP_EXTRACTOR_ARGS || "youtube:player_client=ios,web,mweb";
  if (extractorArgs) {
    extraArgs.push("--extractor-args", extractorArgs);
  }

  return extraArgs;
}

/**
 * Detects if a yt-dlp error string is caused by YouTube anti-bot verification or IP block.
 */
export function isBotDetectionError(rawMsg: string): boolean {
  if (!rawMsg) return false;
  const lower = rawMsg.toLowerCase();
  return (
    lower.includes("sign in to confirm you're not a bot") ||
    lower.includes("sign in to confirm your age") ||
    lower.includes("bot detection") ||
    lower.includes("use --cookies-from-browser or --cookies") ||
    (lower.includes("login_required") && lower.includes("youtube"))
  );
}

/**
 * Formats yt-dlp error messages into friendly, actionable user messages.
 */
export function formatUserFacingError(rawMsg: string): string {
  if (!rawMsg) return "Failed to process video request";

  if (rawMsg.includes("exceeds maximum allowed duration")) {
    return rawMsg;
  }

  if (isBotDetectionError(rawMsg)) {
    return (
      "YouTube Anti-Bot Protection: YouTube blocked requests from this server IP. " +
      "To resolve this on Render or cloud hosting, export your YouTube cookies using a browser extension " +
      "(such as 'Get cookies.txt LOCALLY') and add them in Render as a Secret File (/etc/secrets/cookies.txt) " +
      "or as the YOUTUBE_COOKIES environment variable."
    );
  }

  const match = rawMsg.match(/ERROR:\s*(?:\[[^\]]+\]\s*)?(?:[^\s:]+:\s*)?([^\r\n]+)/);
  if (match) {
    return match[1].trim();
  }

  return rawMsg.replace(/^Error code: Error: Command failed:[^\r\n]*/, "").trim() || rawMsg;
}

/**
 * Returns diagnostic information about cookies, proxy, and yt-dlp configuration.
 */
export function getServiceDiagnostics() {
  const cookieInfo = resolveCookies();
  const proxyUrl =
    process.env.PROXY_URL ||
    process.env.YTDLP_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;
  return {
    cookiesConfigured: Boolean(cookieInfo.path),
    cookiesSource: cookieInfo.source,
    proxyConfigured: Boolean(proxyUrl),
    binaryPath: LOCAL_BIN_PATH,
  };
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
  const commonArgs = getCommonYtDlpArgs();

  const args = [
    url,
    "--dump-json",
    "--no-playlist",
    "--no-warnings",
    "--js-runtimes",
    "node",
    ...commonArgs,
  ];

  let stdout: string;
  try {
    stdout = await yt.execPromise(args);
  } catch (err: any) {
    const message = err.message || "";
    console.error("[yt-dlp] fetchInfo error for", url, message);
    throw new Error(formatUserFacingError(message));
  }

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
  const commonArgs = getCommonYtDlpArgs();

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
    "--no-mtime",
    ...commonArgs
  );

  return new Promise<string>((resolve, reject) => {
    onStatusChange("downloading");

    let stderrData = "";
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
        if (str.includes("[Merger]") || str.includes("[ExtractAudio]") || str.includes("Post-process")) {
          onStatusChange("merging");
        }
        const match = str.match(/(\d{1,3}(?:\.\d+)?)%/);
        if (match) {
          const pct = Math.min(100, Math.max(0, Math.round(parseFloat(match[1]))));
          onProgress(pct);
        }
      });
    }

    if (ytProc.ytDlpProcess?.stderr) {
      ytProc.ytDlpProcess.stderr.on("data", (data: Buffer) => {
        stderrData += data.toString();
      });
    }

    ytProc.on("error", (err: Error) => {
      console.error("[yt-dlp] Process error:", err);
      reject(new Error(formatUserFacingError(err.message || stderrData)));
    });

    ytProc.on("close", async (code?: number) => {
      let finalPath = outPath;

      // If process exited with error or target file doesn't exist directly, check candidates
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

      if (!fs.existsSync(finalPath) && code !== 0 && code !== null && code !== undefined) {
        const errMsg = stderrData.trim() || `Download process exited with code ${code}`;
        return reject(new Error(formatUserFacingError(errMsg)));
      }

      onStatusChange("ready");
      resolve(finalPath);
    });
  });
}
