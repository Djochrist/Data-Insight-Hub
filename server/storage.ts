import { type Dataset, type InsertDataset } from "@shared/schema";

export interface IStorage {
  getDatasets(): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  deleteDataset(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private datasets: Map<number, Dataset>;
  private currentId: number;

  constructor() {
    this.datasets = new Map();
    this.currentId = 1;
  }

  async getDatasets(): Promise<Dataset[]> {
    return Array.from(this.datasets.values());
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const id = this.currentId++;
    const dataset: Dataset = { ...insertDataset, id, createdAt: new Date() };
    this.datasets.set(id, dataset);
    return dataset;
  }

  async deleteDataset(id: number): Promise<void> {
    this.datasets.delete(id);
  }
}

export const storage = new MemStorage();
