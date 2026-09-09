import React, { useState } from "react";
import { Sparkles, AlertCircle, ArrowLeft, Link2, ListChecks, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UrlInput } from "@/components/UrlInput";
import { VideoCard } from "@/components/VideoCard";
import { FormatSelector } from "@/components/FormatSelector";
import { DownloadProgress } from "@/components/DownloadProgress";
import { BatchUrlInput } from "@/components/BatchUrlInput";
import { BatchDownloadManager } from "@/components/BatchDownloadManager";
import { QueueManager, QueueJob } from "@/components/QueueManager";
import { LandingSections } from "@/components/LandingSections";
import { useVideoInfo } from "@/hooks/useVideoInfo";
import { useDownloadJob } from "@/hooks/useDownloadJob";
import { useSocket, useMultiSocket } from "@/hooks/useSocket";
import {
  VideoInfoResponse,
  BatchInfoItem,
  BatchDownloadItem,
  fetchBatchVideoInfo,
  createBatchDownload,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

export function Home() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [showSingleCookieGuide, setShowSingleCookieGuide] = useState(false);

  // Single video flow state
  const [videoInfo, setVideoInfo] = useState<VideoInfoResponse | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  // Batch video flow state
  const [batchItems, setBatchItems] = useState<BatchInfoItem[]>([]);
  const [isInspectingBatch, setIsInspectingBatch] = useState(false);
  const [isStartingBatch, setIsStartingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Global Queue list (tracks all initiated downloads)
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);

  // Socket for single mode
  const { progressData, resetProgress } = useSocket(activeJobId);

  // Multi socket for header count
  const allJobIds = queueJobs.map((j) => j.jobId);
  const { progressMap } = useMultiSocket(allJobIds);

  const activeDownloadsCount = queueJobs.filter((j) => {
    const s = progressMap[j.jobId]?.status || "pending";
    return s === "downloading" || s === "merging" || s === "pending";
  }).length;

  const readyDownloadsCount = queueJobs.filter(
    (j) => progressMap[j.jobId]?.status === "ready"
  ).length;

  // Single Video Handlers
  const { mutate: fetchInfo, isPending: isFetching, error: fetchError, reset: resetFetch } =
    useVideoInfo();

  const { mutate: startDownload, isPending: isStartingDownload, error: downloadError } =
    useDownloadJob();

  const handleFetchSingle = (url: string) => {
    setCurrentUrl(url);
    resetFetch();
    fetchInfo(url, {
      onSuccess: (data) => {
        setVideoInfo(data);
        if (data.formats && data.formats.length > 0) {
          setSelectedFormatId(data.formats[0].formatId);
        }
      },
    });
  };

  const handleStartSingleDownload = () => {
    if (!videoInfo || !selectedFormatId || !currentUrl) return;

    const selectedFormat = videoInfo.formats.find((f) => f.formatId === selectedFormatId);
    const isAudio =
      selectedFormatId === "bestaudio/best" ||
      selectedFormatId === "bestaudio" ||
      selectedFormatId === "audio-mp3" ||
      (!selectedFormatId.includes("bestvideo") && !selectedFormatId.includes("direct") && selectedFormatId.includes("audio")) ||
      Boolean(selectedFormat?.resolution.toLowerCase().includes("audio")) ||
      (selectedFormat?.ext === "mp3" && !selectedFormat?.resolution.includes("p"));
    const ext = isAudio ? "mp3" : (selectedFormat?.ext || "mp4");

    startDownload(
      {
        url: currentUrl,
        formatId: selectedFormatId,
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail,
        ext,
      },
      {
        onSuccess: (res) => {
          setActiveJobId(res.jobId);
          // Add to queue tracker
          setQueueJobs((prev) => [
            {
              jobId: res.jobId,
              url: currentUrl,
              title: videoInfo.title,
              thumbnail: videoInfo.thumbnail,
              formatId: selectedFormatId,
              ext,
              addedAt: Date.now(),
            },
            ...prev,
          ]);
        },
      }
    );
  };

  const handleResetSingle = () => {
    setVideoInfo(null);
    setSelectedFormatId("");
    setActiveJobId(null);
    setCurrentUrl("");
    resetFetch();
    resetProgress();
  };

  // Batch Video Handlers
  const handleInspectBatch = async (urls: string[]) => {
    setIsInspectingBatch(true);
    setBatchError(null);
    try {
      const res = await fetchBatchVideoInfo(urls);
      setBatchItems(res.results);
    } catch (err: any) {
      setBatchError(err.message || "Failed to inspect batch URLs");
    } finally {
      setIsInspectingBatch(false);
    }
  };

  const handleStartBatchDownload = async (downloadItems: BatchDownloadItem[]) => {
    setIsStartingBatch(true);
    try {
      const res = await createBatchDownload(downloadItems);
      // Append created jobs to global queue
      const newJobs: QueueJob[] = res.jobs.map((j) => ({
        jobId: j.jobId,
        url: j.url,
        title: j.title || "Video",
        thumbnail: j.thumbnail,
        formatId: j.formatId,
        ext: j.ext,
        addedAt: Date.now(),
      }));
      setQueueJobs((prev) => [...newJobs, ...prev]);

      // Reset batch inspection view
      setBatchItems([]);

      // Scroll to queue
      setTimeout(() => {
        document.getElementById("queue")?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: any) {
      setBatchError(err.message || "Failed to start batch download");
    } finally {
      setIsStartingBatch(false);
    }
  };

  const handleClearJob = (jobId: string) => {
    setQueueJobs((prev) => prev.filter((j) => j.jobId !== jobId));
    if (activeJobId === jobId) {
      setActiveJobId(null);
    }
  };

  const handleClearAllJobs = () => {
    setQueueJobs([]);
    setActiveJobId(null);
  };

  const scrollToQueue = () => {
    document.getElementById("queue")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen ambient-mesh flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Sticky Navbar */}
      <Navbar
        activeCount={activeDownloadsCount}
        readyCount={readyDownloadsCount}
        onOpenQueue={scrollToQueue}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setBatchError(null);
        }}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-10 pb-16 flex-1 space-y-12">
        {/* Hero Headline */}
        <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold tracking-tight text-foreground leading-[1.15]">
            High-Speed YouTube <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Video & Audio Downloader
            </span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Convert links into pristine 1080p MP4 videos or studio-grade MP3 audio.
            Fast, private, and saved directly to your local machine.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div id="downloader" className="flex justify-center scroll-mt-24">
          <div className="p-1 rounded-xl bg-card border border-border shadow-xs flex items-center gap-1 text-xs sm:text-sm font-medium">
            <button
              onClick={() => setActiveTab("single")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === "single"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="h-4 w-4" />
              <span>Single Video</span>
            </button>

            <button
              onClick={() => setActiveTab("batch")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === "batch"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              <span>Batch Download</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeTab === "batch" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
              }`}>
                Multi
              </span>
            </button>
          </div>
        </div>

        {/* Downloader Card Container */}
        <div className="max-w-[640px] mx-auto w-full">
          <div className="glass-panel rounded-2xl p-5 sm:p-7 shadow-sm transition-all space-y-6">
            {/* SINGLE VIDEO MODE */}
            {activeTab === "single" && (
              <>
                {!videoInfo && !activeJobId && (
                  <div className="space-y-4">
                    <UrlInput onFetch={handleFetchSingle} isLoading={isFetching} />

                    {fetchError && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="font-sans leading-normal font-medium break-words">
                            {fetchError.message || "Failed to fetch video information. Please check the URL."}
                          </span>
                        </div>

                        {(fetchError.message?.toLowerCase().includes("anti-bot") ||
                          fetchError.message?.toLowerCase().includes("bot") ||
                          fetchError.message?.toLowerCase().includes("cookie")) && (
                          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 font-medium">
                                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                                <span>Running on Render? YouTube Requires Cookies</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowSingleCookieGuide(!showSingleCookieGuide)}
                                className="text-[11px] underline underline-offset-2 hover:opacity-80 shrink-0 font-mono text-amber-600 dark:text-amber-400"
                              >
                                {showSingleCookieGuide ? "Hide Steps" : "How to Fix"}
                              </button>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              YouTube blocks unauthenticated requests from cloud server IP addresses (Render/AWS). You can fix this in under 1 minute by adding your browser cookies.
                            </p>
                            {showSingleCookieGuide && (
                              <div className="pt-2 border-t border-amber-500/20 text-[11px] space-y-1.5 font-sans">
                                <p className="font-semibold text-foreground">Steps to configure cookies on Render:</p>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                  <li>Install the extension <strong>&quot;Get cookies.txt LOCALLY&quot;</strong> in your browser.</li>
                                  <li>Visit YouTube while logged in and click Export to save <code>cookies.txt</code>.</li>
                                  <li>In Render Dashboard &rarr; <em>Environment</em> &rarr; <em>Secret Files</em>: Add <code>/etc/secrets/cookies.txt</code> (or set <code>YOUTUBE_COOKIES</code> env var).</li>
                                </ol>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {videoInfo && !activeJobId && (
                  <div className="space-y-5 animate-in fade-in-50 duration-300">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetSingle}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Enter another URL</span>
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">
                        Ready to configure
                      </span>
                    </div>

                    <VideoCard
                      title={videoInfo.title}
                      thumbnail={videoInfo.thumbnail}
                      duration={videoInfo.duration}
                      channel={videoInfo.channel}
                    />

                    <FormatSelector
                      formats={videoInfo.formats}
                      selectedFormatId={selectedFormatId}
                      onSelectFormat={setSelectedFormatId}
                      onDownload={handleStartSingleDownload}
                      isStarting={isStartingDownload}
                    />

                    {downloadError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{downloadError.message || "Failed to queue download"}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeJobId && (
                  <div className="space-y-5 animate-in fade-in-50 duration-300">
                    {videoInfo && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                        <img
                          src={videoInfo.thumbnail}
                          alt=""
                          className="h-10 w-16 object-cover rounded shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate text-foreground">
                            {videoInfo.title}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {selectedFormatId.includes("bestvideo")
                              ? "MP4 Video"
                              : selectedFormatId.includes("audio")
                              ? "Audio MP3"
                              : "MP4 Video"}
                          </p>
                        </div>
                      </div>
                    )}

                    <DownloadProgress
                      jobId={activeJobId}
                      progressData={progressData}
                      onReset={handleResetSingle}
                    />
                  </div>
                )}
              </>
            )}

            {/* BATCH DOWNLOAD MODE */}
            {activeTab === "batch" && (
              <div className="space-y-4">
                {batchItems.length === 0 ? (
                  <>
                    <BatchUrlInput
                      onInspect={handleInspectBatch}
                      isLoading={isInspectingBatch}
                    />

                    {batchError && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="font-sans leading-normal font-medium">{batchError}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <BatchDownloadManager
                    items={batchItems}
                    onStartDownload={handleStartBatchDownload}
                    onCancel={() => setBatchItems([])}
                    isStarting={isStartingBatch}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Queue Manager (shows all ongoing / finished downloads) */}
        <QueueManager
          jobs={queueJobs}
          onClearJob={handleClearJob}
          onClearAll={handleClearAllJobs}
        />

        {/* Landing Page Content Sections */}
        <LandingSections />
      </main>

      {/* Modern Footer */}
      <Footer />
    </div>
  );
}
