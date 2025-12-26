import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function GuideDetails() {
  const [, params] = useRoute("/guides/:id");
  const id = params ? parseInt(params.id) : 0;

  const { data: guide, isLoading } = useQuery({
    queryKey: [`/api/guides/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/guides/${id}`);
      if (!res.ok) throw new Error('Guide not found');
      return res.json();
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background lg:pl-72 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background lg:pl-72 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Guide not found</h1>
        <Link href="/guides" className="text-primary hover:underline">
          Back to Guides
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>{guide.title} - BuildCo</title>
        <meta name="description" content={guide.content.substring(0, 160)} />
      </Helmet>

      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/guides">
          <div className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors cursor-pointer group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Guides
          </div>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {guide.imageUrl && (
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-border">
              <img
                src={guide.imageUrl}
                alt={guide.title}
                className="w-full h-[500px] object-cover"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="inline-block">
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-4 py-2 rounded-full">
                {guide.category}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
              {guide.title}
            </h1>
          </div>

          <div className="prose prose-invert max-w-none">
            <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
              {guide.content}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="bg-card rounded-3xl p-8 border border-border">
              <h3 className="text-xl font-bold text-foreground mb-3">Interested in learning more?</h3>
              <p className="text-muted-foreground mb-6">
                Contact us to discuss how we apply these best practices to your construction project.
              </p>
              <Link href="/contact">
                <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                  Contact Us
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
