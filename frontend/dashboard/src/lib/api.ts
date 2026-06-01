import axios from "axios";
import {
  AdvisorInsight,
  ChatMessage,
  MigrationDetailResponse,
  OverviewStatsResponse,
  ProjectGraphResponse,
  RecentMigration,
  VaultSecret,
  VaultStatsResponse,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sg_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export {
  api,
  type AdvisorInsight,
  type ChatMessage,
  type MigrationDetailResponse,
  type OverviewStatsResponse,
  type ProjectGraphResponse,
  type RecentMigration,
  type VaultSecret,
  type VaultStatsResponse,
};
