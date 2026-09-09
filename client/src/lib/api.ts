import axios from "axios";

export interface VideoFormatOption {
  formatId: string;
  resolution: string;
  ext: string;
  hasAudio: boolean;
  filesize?: number;
  note?: string;
}

export interface VideoInfoResponse {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel?: string;
  formats: VideoFormatOption[];
}

export interface DownloadJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "downloading" | "merging" | "ready" | "failed";
  progress: number;
  title?: string;
  thumbnail?: string;
  errorMessage?: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function fetchVideoInfo(url: string): Promise<VideoInfoResponse> {
  try {
    const { data } = await api.post<VideoInfoResponse>("/api/info", { url });
    return data;
  } catch (error: any) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverError || error.message || "Failed to fetch video information");
  }
}

export async function createDownloadJob(payload: {
  url: string;
  formatId: string;
  title?: string;
  thumbnail?: string;
  ext?: string;
}): Promise<DownloadJobResponse> {
  try {
    const { data } = await api.post<DownloadJobResponse>("/api/download", payload);
    return data;
  } catch (error: any) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverError || error.message || "Failed to create download job");
  }
}

export interface BatchInfoItem {
  url: string;
  success: boolean;
  info?: VideoInfoResponse;
  error?: string;
  isBotChallenge?: boolean;
}

export interface BatchInfoResponse {
  results: BatchInfoItem[];
}

export interface BatchDownloadItem {
  url: string;
  formatId?: string;
  title?: string;
  thumbnail?: string;
  ext?: string;
}

export interface BatchDownloadResponse {
  jobs: Array<{
    jobId: string;
    url: string;
    title?: string;
    thumbnail?: string;
    formatId?: string;
    ext?: string;
  }>;
}

export async function fetchBatchVideoInfo(urls: string[]): Promise<BatchInfoResponse> {
  try {
    const { data } = await api.post<BatchInfoResponse>("/api/batch-info", { urls });
    return data;
  } catch (error: any) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverError || error.message || "Failed to process batch video links");
  }
}

export async function createBatchDownload(items: BatchDownloadItem[]): Promise<BatchDownloadResponse> {
  try {
    const { data } = await api.post<BatchDownloadResponse>("/api/batch-download", { items });
    return data;
  } catch (error: any) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverError || error.message || "Failed to start batch download");
  }
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  try {
    const { data } = await api.get<JobStatusResponse>(`/api/status/${jobId}`);
    return data;
  } catch (error: any) {
    const serverError = error.response?.data?.error || error.response?.data?.message;
    throw new Error(serverError || error.message || "Failed to fetch job status");
  }
}

export function getFileDownloadUrl(jobId: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  return `${baseUrl}/api/file/${jobId}`;
}

export interface ServiceDiagnostics {
  cookiesConfigured: boolean;
  cookiesSource: "env-content" | "env-path" | "render-secret" | "local-file" | "none";
  proxyConfigured: boolean;
  binaryPath: string;
}

export interface ServiceStatusResponse {
  status: string;
  service: string;
  diagnostics: ServiceDiagnostics;
}

export async function fetchServiceStatus(): Promise<ServiceStatusResponse> {
  try {
    const { data } = await api.get<ServiceStatusResponse>("/api/status");
    return data;
  } catch {
    return {
      status: "unknown",
      service: "FetchBird Server",
      diagnostics: {
        cookiesConfigured: false,
        cookiesSource: "none",
        proxyConfigured: false,
        binaryPath: "",
      },
    };
  }
}

