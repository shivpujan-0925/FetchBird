import { useMutation } from "@tanstack/react-query";
import { fetchVideoInfo, VideoInfoResponse } from "@/lib/api";

export function useVideoInfo() {
  return useMutation<VideoInfoResponse, Error, string>({
    mutationFn: (url: string) => fetchVideoInfo(url),
  });
}
