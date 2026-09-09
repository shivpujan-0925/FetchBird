import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setupSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on("subscribe", (jobId: string) => {
      if (jobId && typeof jobId === "string") {
        socket.join(jobId);
        console.log(`[Socket.IO] Socket ${socket.id} subscribed to job: ${jobId}`);
      }
    });

    socket.on("unsubscribe", (jobId: string) => {
      if (jobId && typeof jobId === "string") {
        socket.leave(jobId);
        console.log(`[Socket.IO] Socket ${socket.id} unsubscribed from job: ${jobId}`);
      }
    });

    socket.on("disconnect", () => {
      // disconnected
    });
  });
}

export interface ProgressPayload {
  jobId: string;
  status: "pending" | "downloading" | "merging" | "ready" | "failed";
  progress: number;
  speed?: string;
  eta?: string;
  error?: string;
  filePath?: string;
}

export function emitJobProgress(jobId: string, payload: ProgressPayload): void {
  if (ioInstance) {
    ioInstance.to(jobId).emit("progress", payload);
  }
}
