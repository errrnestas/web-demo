import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Projects
  app.get(api.projects.list.path, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.projects.get.path, async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  });

  // Gallery
  app.get(api.gallery.listByProject.path, async (req, res) => {
    const photos = await storage.getGalleryByProject(Number(req.params.projectId));
    res.json(photos);
  });

  // Guides
  app.get(api.guides.list.path, async (req, res) => {
    const guides = await storage.getGuides();
    res.json(guides);
  });

  app.get(api.guides.get.path, async (req, res) => {
    const guide = await storage.getGuide(Number(req.params.id));
    if (!guide) {
      return res.status(404).json({ message: 'Guide not found' });
    }
    res.json(guide);
  });

  // Service Plans
  app.get(api.servicePlans.list.path, async (req, res) => {
    const plans = await storage.getServicePlans();
    res.json(plans);
  });

  // Inquiries
  app.post(api.inquiries.create.path, async (req, res) => {
    try {
      const input = api.inquiries.create.input.parse(req.body);
      const inquiry = await storage.createInquiry(input);
      res.status(201).json(inquiry);
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

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getProjects();
  if (existing.length === 0) {
    // Create projects
    const project1 = await storage.createProject({
      title: "Modern Family Home in Vilnius",
      description: "A beautiful 2-story house with 4 bedrooms, 2 bathrooms, and a spacious garden. Built with high-quality materials and energy-efficient systems.",
      imageUrl: "https://images.unsplash.com/photo-1600596542815-27bfef40ba0c?q=80&w=2070&auto=format&fit=crop",
      location: "Vilnius, Lithuania",
      area: 180,
      price: "€250,000"
    });
    const project2 = await storage.createProject({
      title: "Cozy Forest Cottage",
      description: "Perfect getaway home surrounded by nature. Features a large terrace, fireplace, and open-plan living area.",
      imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?q=80&w=2065&auto=format&fit=crop",
      location: "Trakai District",
      area: 120,
      price: "€145,000"
    });
    
    // Add gallery photos for first project
    await storage.createGalleryPhoto({
      projectId: project1.id,
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
      caption: "Living room with natural lighting"
    });
    await storage.createGalleryPhoto({
      projectId: project1.id,
      imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2070&auto=format&fit=crop",
      caption: "Modern kitchen"
    });
    await storage.createGalleryPhoto({
      projectId: project1.id,
      imageUrl: "https://images.unsplash.com/photo-1540932239986-310128078ceb?q=80&w=2070&auto=format&fit=crop",
      caption: "Master bedroom"
    });

    // Add gallery photos for second project
    await storage.createGalleryPhoto({
      projectId: project2.id,
      imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2070&auto=format&fit=crop",
      caption: "Exterior view at sunset"
    });
    await storage.createGalleryPhoto({
      projectId: project2.id,
      imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=2070&auto=format&fit=crop",
      caption: "Cozy interior"
    });
  }

  const existingGuides = await storage.getGuides();
  if (existingGuides.length === 0) {
    await storage.createGuide({
      title: "Foundation Preparation",
      content: "A solid foundation is the key to a durable house. We begin with thorough soil testing and site preparation. Our team ensures proper drainage, compaction, and uses high-quality concrete to prevent settling and cracks over time.",
      category: "Foundation",
      imageUrl: "https://images.unsplash.com/photo-1537904904737-13fc27b03b76?q=80&w=2070&auto=format&fit=crop"
    });
    await storage.createGuide({
      title: "Wall Construction Best Practices",
      content: "Strong walls require quality materials and expert craftsmanship. We use premium bricks or concrete blocks with proper mortar composition. Each wall is plumbed, leveled, and reinforced according to modern building codes for maximum structural integrity.",
      category: "Walls",
      imageUrl: "https://images.unsplash.com/photo-1541695490-7734a2017fea?q=80&w=2070&auto=format&fit=crop"
    });
    await storage.createGuide({
      title: "Roofing Systems",
      content: "Your roof protects your entire home. We install high-quality roofing materials with proper underlayment, ventilation, and waterproofing. Correct slope and drainage are essential to prevent leaks and ensure longevity of your structure.",
      category: "Roof",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2070&auto=format&fit=crop"
    });
    await storage.createGuide({
      title: "Electrical Safety Standards",
      content: "Proper electrical systems are crucial for safety. All installations follow national and international standards. We use certified electricians and quality materials, with regular inspections to ensure your home's electrical system is safe and efficient.",
      category: "Electrical",
      imageUrl: "https://images.unsplash.com/photo-1581092162562-40038f63dd65?q=80&w=2070&auto=format&fit=crop"
    });
  }

  const existingPlans = await storage.getServicePlans();
  if (existingPlans.length === 0) {
    await storage.createServicePlan({
      name: "Basic Package",
      description: "Perfect for starter homes and small projects",
      price: "€80,000 - €150,000",
      features: [
        "Site preparation and foundation",
        "Basic wall construction",
        "Roofing installation",
        "Windows and doors",
        "Basic plumbing",
        "Electrical wiring",
        "Interior finishing"
      ]
    });
    await storage.createServicePlan({
      name: "Standard Package",
      description: "Most popular choice for family homes",
      price: "€150,000 - €300,000",
      features: [
        "Everything in Basic Package",
        "Premium materials",
        "Advanced HVAC system",
        "Energy-efficient windows",
        "Quality flooring",
        "Custom kitchen setup",
        "Bathroom fixtures",
        "Landscaping"
      ]
    });
    await storage.createServicePlan({
      name: "Premium Package",
      description: "Luxury homes with all modern amenities",
      price: "€300,000+",
      features: [
        "Everything in Standard Package",
        "Smart home technology",
        "Premium finishes",
        "Custom design elements",
        "Solar panels option",
        "Heated floors",
        "Premium appliances",
        "Extended warranty",
        "Dedicated project manager"
      ]
    });
  }
}
