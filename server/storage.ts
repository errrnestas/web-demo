import { db } from "./db";
import {
  projects,
  galleryPhotos,
  guides,
  servicePlans,
  inquiries,
  type InsertProject,
  type InsertGalleryPhoto,
  type InsertGuide,
  type InsertServicePlan,
  type InsertInquiry,
  type Project,
  type GalleryPhoto,
  type Guide,
  type ServicePlan,
  type Inquiry
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Gallery
  getGalleryByProject(projectId: number): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  
  // Guides
  getGuides(): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  createGuide(guide: InsertGuide): Promise<Guide>;
  
  // Service Plans
  getServicePlans(): Promise<ServicePlan[]>;
  createServicePlan(plan: InsertServicePlan): Promise<ServicePlan>;
  
  // Inquiries
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getGalleryByProject(projectId: number): Promise<GalleryPhoto[]> {
    return await db.select().from(galleryPhotos).where(eq(galleryPhotos.projectId, projectId));
  }

  async createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const [newPhoto] = await db.insert(galleryPhotos).values(photo).returning();
    return newPhoto;
  }

  async getGuides(): Promise<Guide[]> {
    return await db.select().from(guides).orderBy(desc(guides.createdAt));
  }

  async getGuide(id: number): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide;
  }

  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide).returning();
    return newGuide;
  }

  async getServicePlans(): Promise<ServicePlan[]> {
    return await db.select().from(servicePlans).orderBy(desc(servicePlans.createdAt));
  }

  async createServicePlan(plan: InsertServicePlan): Promise<ServicePlan> {
    const [newPlan] = await db.insert(servicePlans).values(plan).returning();
    return newPlan;
  }

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }
}

export const storage = new DatabaseStorage();
