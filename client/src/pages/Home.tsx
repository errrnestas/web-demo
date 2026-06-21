import { useProjects } from "@/hooks/use-projects";
import { ProjectCard } from "@/components/ProjectCard";
import { Navigation } from "@/components/Navigation";
import { Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "wouter";

export default function Home() {
  const { data: projects, isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects?.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>BuildCo - Premium Individual Home Construction</title>
        <meta name="description" content="Find your dream home design. We specialize in high-quality individual house construction with modern designs." />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header Section */}
        <div className="mb-10">
          {/* 3D Designer Banner */}
          <Link href="/designer">
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-blue-950 to-indigo-900 border border-blue-800 hover:border-blue-600 transition-all cursor-pointer group shadow-lg shadow-blue-950/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏠</span>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Nauja!</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">3D Namų Dizaineris</h2>
                  <p className="text-sm text-blue-300">Sukurkite savo namų planą, pridėkite baldus, peržiūrėkite 3D vaizdu. Įdiegiama į telefoną.</p>
                </div>
                <div className="shrink-0 ml-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 group-hover:bg-blue-500 transition-colors flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
                Discover Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Dream Home</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Browse our catalog of premium house designs. Quality construction, modern aesthetics, and transparent pricing.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-foreground">Trusted by</p>
                <p className="text-xs text-muted-foreground">500+ Families</p>
              </div>
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    U{i}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search by location or project name..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-lg shadow-black/5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-2 right-2">
              <button className="h-full px-4 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground font-medium transition-colors flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl h-[400px] animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No projects found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your search terms.</p>
          </div>
        )}
      </main>
    </div>
  );
}
