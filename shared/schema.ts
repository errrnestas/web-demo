import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  location: text("location").notNull(),
  area: integer("area"), // in sq meters
  price: text("price"), // text to allow "Contact for price" or ranges
  createdAt: timestamp("created_at").defaultNow(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // e.g. "Foundation", "Walls", "Roof"
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const servicePlans = pgTable("service_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(),
  features: text("features").array(), // Array of feature descriptions
  createdAt: timestamp("created_at").defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  projectId: integer("project_id"), // Optional reference to a project
  createdAt: timestamp("created_at").defaultNow(),
});

export const designPlans = pgTable("design_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  planData: text("plan_data").notNull(), // JSON stringified FloorPlan
  thumbnail: text("thumbnail"), // base64 or URL
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDesignPlanSchema = createInsertSchema(designPlans).omit({ id: true, createdAt: true, updatedAt: true });
export type DesignPlan = typeof designPlans.$inferSelect;
export type InsertDesignPlan = z.infer<typeof insertDesignPlanSchema>;

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertGalleryPhotoSchema = createInsertSchema(galleryPhotos).omit({ id: true, createdAt: true });
export const insertGuideSchema = createInsertSchema(guides).omit({ id: true, createdAt: true });
export const insertServicePlanSchema = createInsertSchema(servicePlans).omit({ id: true, createdAt: true });
export const insertInquirySchema = createInsertSchema(inquiries).omit({ id: true, createdAt: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = z.infer<typeof insertGalleryPhotoSchema>;
export type Guide = typeof guides.$inferSelect;
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type ServicePlan = typeof servicePlans.$inferSelect;
export type InsertServicePlan = z.infer<typeof insertServicePlanSchema>;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
