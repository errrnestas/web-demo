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
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getGalleryByProject(projectId: number): Promise<GalleryPhoto[]>;
  createGalleryPhoto(photo: InsertGalleryPhoto): Promise<GalleryPhoto>;
  getGuides(): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  createGuide(guide: InsertGuide): Promise<Guide>;
  getServicePlans(): Promise<ServicePlan[]>;
  createServicePlan(plan: InsertServicePlan): Promise<ServicePlan>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
}

export class DatabaseStorage implements IStorage {
  async getProjects() {
    return db!.select().from(projects).orderBy(desc(projects.createdAt));
  }
  async getProject(id: number) {
    const [p] = await db!.select().from(projects).where(eq(projects.id, id));
    return p;
  }
  async createProject(project: InsertProject) {
    const [p] = await db!.insert(projects).values(project).returning();
    return p;
  }
  async getGalleryByProject(projectId: number) {
    return db!.select().from(galleryPhotos).where(eq(galleryPhotos.projectId, projectId));
  }
  async createGalleryPhoto(photo: InsertGalleryPhoto) {
    const [p] = await db!.insert(galleryPhotos).values(photo).returning();
    return p;
  }
  async getGuides() {
    return db!.select().from(guides).orderBy(desc(guides.createdAt));
  }
  async getGuide(id: number) {
    const [g] = await db!.select().from(guides).where(eq(guides.id, id));
    return g;
  }
  async createGuide(guide: InsertGuide) {
    const [g] = await db!.insert(guides).values(guide).returning();
    return g;
  }
  async getServicePlans() {
    return db!.select().from(servicePlans).orderBy(desc(servicePlans.createdAt));
  }
  async createServicePlan(plan: InsertServicePlan) {
    const [p] = await db!.insert(servicePlans).values(plan).returning();
    return p;
  }
  async createInquiry(inquiry: InsertInquiry) {
    const [i] = await db!.insert(inquiries).values(inquiry).returning();
    return i;
  }
}

// Fallback in-memory storage when no DB is available
let _id = 1;
const nextId = () => _id++;

class MemoryStorage implements IStorage {
  private projects: Project[] = [];
  private photos: GalleryPhoto[] = [];
  private guides: Guide[] = [];
  private plans: ServicePlan[] = [];

  async getProjects() { return this.projects; }
  async getProject(id: number) { return this.projects.find(p => p.id === id); }
  async createProject(p: InsertProject): Promise<Project> {
    const row = { ...p, id: nextId(), createdAt: new Date(), area: p.area ?? null, price: p.price ?? null } as Project;
    this.projects.push(row); return row;
  }
  async getGalleryByProject(id: number) { return this.photos.filter(p => p.projectId === id); }
  async createGalleryPhoto(p: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const row = { ...p, id: nextId(), createdAt: new Date(), caption: p.caption ?? null } as GalleryPhoto;
    this.photos.push(row); return row;
  }
  async getGuides() { return this.guides; }
  async getGuide(id: number) { return this.guides.find(g => g.id === id); }
  async createGuide(g: InsertGuide): Promise<Guide> {
    const row = { ...g, id: nextId(), createdAt: new Date(), imageUrl: g.imageUrl ?? null } as Guide;
    this.guides.push(row); return row;
  }
  async getServicePlans() { return this.plans; }
  async createServicePlan(p: InsertServicePlan): Promise<ServicePlan> {
    const row = { ...p, id: nextId(), createdAt: new Date(), features: p.features ?? null } as ServicePlan;
    this.plans.push(row); return row;
  }
  async createInquiry(i: InsertInquiry): Promise<Inquiry> {
    return { ...i, id: nextId(), createdAt: new Date(), projectId: i.projectId ?? null } as Inquiry;
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new MemoryStorage();
