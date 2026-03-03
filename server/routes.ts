import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.datasets.list.path, async (req, res) => {
    const datasets = await storage.getDatasets();
    res.json(datasets);
  });

  app.get(api.datasets.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const dataset = await storage.getDataset(id);
    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }
    res.json(dataset);
  });

  app.post(api.datasets.create.path, async (req, res) => {
    try {
      const input = api.datasets.create.input.parse(req.body);
      const dataset = await storage.createDataset(input);
      res.status(201).json(dataset);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.datasets.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const dataset = await storage.getDataset(id);
    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }
    await storage.deleteDataset(id);
    res.status(204).send();
  });

  // Seed sample data
  const existing = await storage.getDatasets();
  if (existing.length === 0) {
    await storage.createDataset({
      name: "Sample Analytics Data",
      columns: [
        { key: "month", name: "Month", type: "string" },
        { key: "revenue", name: "Revenue ($)", type: "number" },
        { key: "users", name: "Active Users", type: "number" },
        { key: "bounceRate", name: "Bounce Rate (%)", type: "number" }
      ],
      data: [
        { month: "Jan", revenue: 10500, users: 1200, bounceRate: 45 },
        { month: "Feb", revenue: 12000, users: 1400, bounceRate: 42 },
        { month: "Mar", revenue: 11000, users: 1350, bounceRate: 48 },
        { month: "Apr", revenue: 15000, users: 1800, bounceRate: 35 },
        { month: "May", revenue: 16500, users: 2100, bounceRate: 32 },
        { month: "Jun", revenue: 19000, users: 2400, bounceRate: 28 },
      ]
    });
  }

  return httpServer;
}
