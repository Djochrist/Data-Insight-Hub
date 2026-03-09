import { z } from 'zod';
import { insertDatasetSchema, datasets } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  datasets: {
    list: {
      method: 'GET' as const,
      path: '/api/datasets' as const,
      responses: {
        200: z.array(z.custom<typeof datasets.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/datasets/:id' as const,
      responses: {
        200: z.custom<typeof datasets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/datasets' as const,
      input: insertDatasetSchema,
      responses: {
        201: z.custom<typeof datasets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/datasets/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DatasetResponse = z.infer<typeof api.datasets.get.responses[200]>;
export type DatasetsListResponse = z.infer<typeof api.datasets.list.responses[200]>;
