import { useMutation } from "@tanstack/react-query";
import { createDownloadJob, DownloadJobResponse } from "@/lib/api";

export interface CreateDownloadParams {
  url: string;
  formatId: string;
  title?: string;
  thumbnail?: string;
  ext?: string;
}

export function useDownloadJob() {
  return useMutation<DownloadJobResponse, Error, CreateDownloadParams>({
    mutationFn: (params: CreateDownloadParams) => createDownloadJob(params),
  });
}
