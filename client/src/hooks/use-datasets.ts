import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type DatasetResponse, type DatasetsListResponse } from "@shared/routes";
import type { InsertDataset } from "@shared/schema";
import { z } from "zod";
import { authHeader } from "@/lib/auth";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useDatasets() {
  return useQuery({
    queryKey: [api.datasets.list.path],
    queryFn: async () => {
      const res = await fetch(api.datasets.list.path, { headers: authHeader() });
      if (!res.ok) throw new Error("Failed to fetch datasets");
      const data = await res.json();
      return parseWithLogging(api.datasets.list.responses[200], data, "datasets.list");
    },
  });
}

export function useDataset(id: number | null | undefined) {
  return useQuery({
    queryKey: [api.datasets.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.datasets.get.path, { id });
      const res = await fetch(url, { headers: authHeader() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch dataset");
      const data = await res.json();
      return parseWithLogging(api.datasets.get.responses[200], data, "datasets.get");
    },
    enabled: !!id,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDataset) => {
      // Don't log full data to avoid locking up console with huge JSON payloads
      const res = await fetch(api.datasets.create.path, {
        method: api.datasets.create.method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const errData = await res.json();
          throw new Error(errData.message || "Validation failed");
        }
        throw new Error("Failed to upload dataset");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.datasets.list.path] });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.datasets.delete.path, { id });
      const res = await fetch(url, { method: api.datasets.delete.method, headers: authHeader() });
      if (res.status === 404) throw new Error("Dataset not found");
      if (!res.ok) throw new Error("Failed to delete dataset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.datasets.list.path] });
    },
  });
}
