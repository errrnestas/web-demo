import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

interface Guide {
  id: number;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
}

export default function Guides() {
  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['/api/guides'],
    queryFn: async () => {
      const res = await fetch('/api/guides');
      return res.json();
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>Building Guides & Construction Tips | BuildCo</title>
        <meta name="description" content="Learn how to build correctly. Expert guides on foundations, walls, roofing, electrical systems and more." />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 lg:pt-8">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Building Guides & Tips
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Learn the best practices for construction. Our experts share essential knowledge for building quality homes.
          </p>
        </div>

        {/* Guides Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-3xl h-[350px] animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {guides.map((guide: Guide) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <div className="group cursor-pointer h-full overflow-hidden rounded-3xl border border-border bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                  {guide.imageUrl && (
                    <div className="overflow-hidden h-48">
                      <img
                        src={guide.imageUrl}
                        alt={guide.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-6 md:p-8">
                    <div className="inline-block mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                        {guide.category}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>

                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6">
                      {guide.content.substring(0, 150)}...
                    </p>

                    <div className="flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
