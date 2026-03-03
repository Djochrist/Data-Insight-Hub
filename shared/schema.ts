import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  columns: jsonb("columns").notNull(), // Array of { key: string, name: string, type: string }
  data: jsonb("data").notNull(), // Array of records
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({ id: true, createdAt: true });

export type Dataset = typeof datasets.$inferSelect;
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
