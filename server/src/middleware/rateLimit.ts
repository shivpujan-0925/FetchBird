import rateLimit from "express-rate-limit";

// Rate limiter for info endpoint: 30 requests per minute per IP
export const infoRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many info requests from this IP. Please wait a minute before trying again.",
  },
});

// Rate limiter for download initiation: 10 downloads per minute per IP
export const downloadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many download requests from this IP. Please wait a minute before trying again.",
  },
});
