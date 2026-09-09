import PQueue from "p-queue";

const concurrency = Number(process.env.MAX_CONCURRENT_DOWNLOADS ?? 2);

export const downloadQueue = new PQueue({ concurrency });

export function enqueueDownload<T>(task: () => Promise<T>): Promise<T> {
  return downloadQueue.add(task) as Promise<T>;
}

export function getQueueStatus() {
  return {
    size: downloadQueue.size,
    pending: downloadQueue.pending,
    concurrency,
  };
}
