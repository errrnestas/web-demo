import { z } from 'zod';
import { insertProjectSchema, insertGalleryPhotoSchema, insertGuideSchema, insertServicePlanSchema, insertInquirySchema, projects, galleryPhotos, guides, servicePlans, inquiries } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.custom<typeof projects.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  gallery: {
    listByProject: {
      method: 'GET' as const,
      path: '/api/projects/:projectId/gallery',
      responses: {
        200: z.array(z.custom<typeof galleryPhotos.$inferSelect>()),
      },
    },
  },
  guides: {
    list: {
      method: 'GET' as const,
      path: '/api/guides',
      responses: {
        200: z.array(z.custom<typeof guides.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/guides/:id',
      responses: {
        200: z.custom<typeof guides.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  servicePlans: {
    list: {
      method: 'GET' as const,
      path: '/api/service-plans',
      responses: {
        200: z.array(z.custom<typeof servicePlans.$inferSelect>()),
      },
    },
  },
  inquiries: {
    create: {
      method: 'POST' as const,
      path: '/api/inquiries',
      input: insertInquirySchema,
      responses: {
        201: z.custom<typeof inquiries.$inferSelect>(),
        400: errorSchemas.validation,
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

export type ProjectResponse = z.infer<typeof api.projects.get.responses[200]>;
export type GalleryPhotoResponse = z.infer<typeof api.gallery.listByProject.responses[200]>;
export type GuideResponse = z.infer<typeof api.guides.get.responses[200]>;
export type ServicePlanResponse = z.infer<typeof api.servicePlans.list.responses[200]>;
export type InquiryInput = z.infer<typeof api.inquiries.create.input>;
