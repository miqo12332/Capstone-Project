import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
  headers: { "Content-Type": "application/json" },
});

// attach auth user if you ever add JWT later
api.interceptors.request.use((config) => {
  const user = localStorage.getItem("user");
  if (user) {
    const u = JSON.parse(user);
    // config.headers.Authorization = `Bearer ${u.token}`;
  }
  return config;
});

const API_BASE = "http://localhost:5001/api";

export const apiGet = async (url) => {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`GET ${url} failed`);
  return res.json();
};

export const apiPost = async (url, body) => {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed`);
  return res.json();
};

export const apiPut = async (url, body) => {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url} failed`);
  return res.json();
};

export const apiDelete = async (url) => {   // ✅ this might be missing
  const res = await fetch(`${API_BASE}${url}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${url} failed`);
  return res.json();
};

export default api;