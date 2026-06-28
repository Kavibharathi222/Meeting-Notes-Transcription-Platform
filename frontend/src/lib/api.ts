/**
 * Centralized API base URL.
 * Uses NEXT_PUBLIC_API_URL env var in production,
 * falls back to localhost:8000 for local dev.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default API_BASE;
