import {
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

export class MemoryStorage implements IStorage {
  private _projects: Project[] = [];
  private _gallery: GalleryPhoto[] = [];
  private _guides: Guide[] = [];
  private _plans: ServicePlan[] = [];
  private _inquiries: Inquiry[] = [];
  private idCounter = 1;

  private nextId() { return this.idCounter++; }

  async getProjects() { return [...this._projects].reverse(); }
  async getProject(id: number) { return this._projects.find(p => p.id === id); }

  async createProject(data: InsertProject): Promise<Project> {
    const p: Project = {
      id: this.nextId(),
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      location: data.location,
      area: data.area ?? null,
      price: data.price ?? null,
      createdAt: new Date(),
    };
    this._projects.push(p);
    return p;
  }

  async getGalleryByProject(projectId: number) {
    return this._gallery.filter(g => g.projectId === projectId);
  }

  async createGalleryPhoto(data: InsertGalleryPhoto): Promise<GalleryPhoto> {
    const g: GalleryPhoto = {
      id: this.nextId(),
      projectId: data.projectId!,
      imageUrl: data.imageUrl,
      caption: data.caption ?? null,
      createdAt: new Date(),
    };
    this._gallery.push(g);
    return g;
  }

  async getGuides() { return [...this._guides].reverse(); }
  async getGuide(id: number) { return this._guides.find(g => g.id === id); }

  async createGuide(data: InsertGuide): Promise<Guide> {
    const g: Guide = {
      id: this.nextId(),
      title: data.title,
      content: data.content,
      category: data.category,
      imageUrl: data.imageUrl ?? null,
      createdAt: new Date(),
    };
    this._guides.push(g);
    return g;
  }

  async getServicePlans() { return [...this._plans].reverse(); }

  async createServicePlan(data: InsertServicePlan): Promise<ServicePlan> {
    const p: ServicePlan = {
      id: this.nextId(),
      name: data.name,
      description: data.description,
      price: data.price,
      features: data.features ?? null,
      createdAt: new Date(),
    };
    this._plans.push(p);
    return p;
  }

  async createInquiry(data: InsertInquiry): Promise<Inquiry> {
    const i: Inquiry = {
      id: this.nextId(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      projectId: data.projectId ?? null,
      createdAt: new Date(),
    };
    this._inquiries.push(i);
    return i;
  }
}

export const storage = new MemoryStorage();
