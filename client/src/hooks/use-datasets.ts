import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDataset,
  deleteDataset,
  getDataset,
  listDatasets,
  type CreateDatasetInput,
} from "@/lib/datasets";

const DATASETS_QUERY_KEY = ["local-datasets"];

export function useDatasets() {
  return useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: async () => listDatasets(),
  });
}

export function useDataset(id: number | null | undefined) {
  return useQuery({
    queryKey: [...DATASETS_QUERY_KEY, id],
    queryFn: async () => (id ? getDataset(id) : null),
    enabled: !!id,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDatasetInput) => createDataset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const deleted = deleteDataset(id);
      if (!deleted) {
        throw new Error("Jeu de données introuvable");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
    },
  });
}
