const defaultHost =
  typeof window !== "undefined" && window.location.hostname
    ? window.location.hostname
    : "localhost";

const apiOrigin = import.meta.env.VITE_API_ORIGIN || `http://${defaultHost}:5001`;

export const API_BASE = `${apiOrigin}/api`;
export const ASSET_BASE = apiOrigin;
