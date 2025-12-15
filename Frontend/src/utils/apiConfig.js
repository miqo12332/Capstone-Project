const defaultHost =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "localhost";

const apiOrigin = import.meta.env.VITE_API_ORIGIN || `http://${defaultHost}:4000`;

// Always use relative paths in the browser
export const API_BASE = "/api";
export const ASSET_BASE = "";
