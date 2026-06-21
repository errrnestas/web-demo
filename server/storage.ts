import {
  type InsertProject,
  type InsertGalleryPhoto,
  type InsertGuide,
  type InsertServicePlan,
  type InsertInquiry,
  type InsertDesignPlan,
  type Project,
  type GalleryPhoto,
  type Guide,
  type ServicePlan,
  type Inquiry,
  type DesignPlan,
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
  getDesignPlans(): Promise<DesignPlan[]>;
  getDesignPlan(id: number): Promise<DesignPlan | undefined>;
  createDesignPlan(plan: InsertDesignPlan): Promise<DesignPlan>;
  updateDesignPlan(id: number, plan: Partial<InsertDesignPlan>): Promise<DesignPlan | undefined>;
  deleteDesignPlan(id: number): Promise<boolean>;
}

export class MemoryStorage implements IStorage {
  private _projects: Project[] = [];
  private _gallery: GalleryPhoto[] = [];
  private _guides: Guide[] = [];
  private _plans: ServicePlan[] = [];
  private _inquiries: Inquiry[] = [];
  private _designPlans: DesignPlan[] = [];
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

  async getDesignPlans(): Promise<DesignPlan[]> {
    return [...this._designPlans].sort((a, b) =>
      (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
    );
  }

  async getDesignPlan(id: number): Promise<DesignPlan | undefined> {
    return this._designPlans.find(p => p.id === id);
  }

  async createDesignPlan(data: InsertDesignPlan): Promise<DesignPlan> {
    const now = new Date();
    const p: DesignPlan = {
      id: this.nextId(),
      name: data.name,
      planData: data.planData,
      thumbnail: data.thumbnail ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this._designPlans.push(p);
    return p;
  }

  async updateDesignPlan(id: number, data: Partial<InsertDesignPlan>): Promise<DesignPlan | undefined> {
    const idx = this._designPlans.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this._designPlans[idx] = {
      ...this._designPlans[idx],
      ...data,
      updatedAt: new Date(),
    };
    return this._designPlans[idx];
  }

  async deleteDesignPlan(id: number): Promise<boolean> {
    const idx = this._designPlans.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this._designPlans.splice(idx, 1);
    return true;
  }
}

export const storage = new MemoryStorage();
