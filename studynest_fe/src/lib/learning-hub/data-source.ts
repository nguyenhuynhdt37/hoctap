import type { HubDataSource } from "./types";

export function getHubDataSource(): HubDataSource {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_HUB_DATA_SOURCE === "mock"
    ? "mock"
    : "api";
}
