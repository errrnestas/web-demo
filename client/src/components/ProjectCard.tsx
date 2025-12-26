import { Project } from "@shared/schema";
import { Link } from "wouter";
import { MapPin, Maximize, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-card rounded-2xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full"
    >
      <Link href={`/projects/${project.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
          {/* Using Unsplash images directly as per instructions if available in data, or static import fallback logic would be here */}
          <img 
            src={project.imageUrl} 
            alt={project.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <span className="inline-block px-3 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-bold text-foreground mb-2 shadow-sm">
              {project.price}
            </span>
            <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">
              {project.title}
            </h3>
          </div>
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[120px]">{project.location}</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <Maximize className="w-4 h-4 text-primary" />
            <span>{project.area} m²</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
          {project.description}
        </p>

        <Link href={`/projects/${project.id}`}>
          <button className="w-full py-2.5 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 flex items-center justify-center gap-2 group-hover:gap-3">
            View Details
            <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
