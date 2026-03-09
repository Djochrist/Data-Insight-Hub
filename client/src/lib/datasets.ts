export type DatasetColumnType = "number" | "string";

export type DatasetColumn = {
  key: string;
  name: string;
  type: DatasetColumnType;
};

export type DatasetRow = Record<string, unknown>;

export type LocalDataset = {
  id: number;
  name: string;
  columns: DatasetColumn[];
  data: DatasetRow[];
  createdAt: string;
};

export type CreateDatasetInput = {
  name: string;
  columns: DatasetColumn[];
  data: DatasetRow[];
};

const STORAGE_KEY = "data-insight-hub.datasets.v2";
const SAFE_STORAGE_LIMIT_BYTES = 4 * 1024 * 1024;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readDatasets(): LocalDataset[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LocalDataset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDatasets(datasets: LocalDataset[]) {
  if (!canUseStorage()) {
    return;
  }

  const serialized = JSON.stringify(datasets);
  if (serialized.length > SAFE_STORAGE_LIMIT_BYTES) {
    throw new Error("Espace de stockage local insuffisant pour enregistrer ce fichier.");
  }

  window.localStorage.setItem(STORAGE_KEY, serialized);
}

export function listDatasets() {
  return readDatasets().sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getDataset(id: number) {
  return readDatasets().find((dataset) => dataset.id === id) ?? null;
}

export function createDataset(input: CreateDatasetInput) {
  const datasets = readDatasets();
  const nextId = datasets.reduce((maxId, dataset) => Math.max(maxId, dataset.id), 0) + 1;

  const dataset: LocalDataset = {
    id: nextId,
    name: input.name.trim() || `dataset-${nextId}`,
    columns: input.columns,
    data: input.data,
    createdAt: new Date().toISOString(),
  };

  try {
    writeDatasets([dataset, ...datasets]);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Impossible d’enregistrer ce fichier dans le navigateur.");
  }

  return dataset;
}

export function deleteDataset(id: number) {
  const datasets = readDatasets();
  const nextDatasets = datasets.filter((dataset) => dataset.id !== id);
  const deleted = nextDatasets.length !== datasets.length;

  if (deleted) {
    writeDatasets(nextDatasets);
  }

  return deleted;
}

export function clearDatasets() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function estimateStoredDatasetsSize() {
  if (!canUseStorage()) {
    return 0;
  }

  return window.localStorage.getItem(STORAGE_KEY)?.length ?? 0;
}

export function getSafeStorageLimit() {
  return SAFE_STORAGE_LIMIT_BYTES;
}
