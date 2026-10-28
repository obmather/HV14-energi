import { queryOptions } from "@tanstack/react-query";
import { DATA_MODE } from "./config";
import { apiSource } from "./api-client";
import { mockSource } from "./mock-adapter";
import type { DataSource } from "./types";

export const dataSource: DataSource = DATA_MODE === "mock" ? mockSource : apiSource;

const common = { staleTime: 60_000, refetchInterval: 5 * 60_000, retry: 1 } as const;

export const metersQuery = () =>
  queryOptions({ queryKey: ["hv14", "meters"], queryFn: () => dataSource.getMeters(), ...common });

export const latestQuery = (id: string) =>
  queryOptions({ queryKey: ["hv14", "latest", id], queryFn: () => dataSource.getLatest(id), ...common });

export const readingsQuery = (id: string) =>
  queryOptions({ queryKey: ["hv14", "readings", id], queryFn: () => dataSource.getReadings(id), ...common });

export const dailyConsumptionQuery = (channelId: string, limit: number) =>
  queryOptions({
    queryKey: ["hv14", "consumption", "daily", channelId, limit],
    queryFn: () => dataSource.getDailyConsumption(channelId, limit),
    ...common,
  });
