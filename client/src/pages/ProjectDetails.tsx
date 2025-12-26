import { useProject, useCreateInquiry } from "@/hooks/use-projects";
import { Navigation } from "@/components/Navigation";
import { Link, useRoute } from "wouter";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MapPin, Maximize, Calendar, CheckCircle2, Building, Mail, Phone, User, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertInquirySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Schema for form validation
const inquiryFormSchema = insertInquirySchema.extend({
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Phone number is too short"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type InquiryForm = z.infer<typeof inquiryFormSchema>;

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: project, isLoading } = useProject(id);
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  
  const { data: galleryPhotos = [] } = useQuery({
    queryKey: [`/api/projects/${id}/gallery`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/gallery`);
      return res.json();
    },
    enabled: !!id
  });
  
  const createInquiry = useCreateInquiry();
  
  const form = useForm<InquiryForm>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      projectId: id,
      name: "",
      email: "",
      phone: "",
      message: "I am interested in this project. Please contact me with more details.",
    }
  });

  const onSubmit = (data: InquiryForm) => {
    createInquiry.mutate({ ...data, projectId: id }, {
      onSuccess: () => {
        toast({
          title: "Inquiry Sent!",
          description: "We'll get back to you shortly.",
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) return <div className="min-h-screen bg-background lg:pl-72 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/></div>;
  if (!project) return <div className="min-h-screen bg-background lg:pl-72 flex flex-col items-center justify-center p-8 text-center"><h1 className="text-2xl font-bold mb-4">Project not found</h1><Link href="/" className="text-primary hover:underline">Go Home</Link></div>;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>{project.title} - BuildCo</title>
        <meta name="description" content={`Check out ${project.title} in ${project.location}. ${project.description.substring(0, 100)}...`} />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/">
          <div className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors cursor-pointer group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Projects
          </div>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-border"
            >
              {/* Unsplash image - architecture/modern house */}
              <img 
                src={project.imageUrl} 
                alt={project.title}
                className="w-full h-[400px] md:h-[500px] object-cover"
              />
            </motion.div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">{project.title}</h1>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <MapPin className="w-5 h-5" />
                    {project.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{project.price}</div>
                  <div className="text-sm text-muted-foreground">Estimated Cost</div>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Maximize, label: "Area", value: `${project.area} m²` },
                  { icon: Building, label: "Type", value: "Individual" },
                  { icon: Calendar, label: "Built", value: "2024" },
                  { icon: CheckCircle2, label: "Status", value: "Available" },
                ].map((spec, i) => (
                  <div key={i} className="bg-card border border-border p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-primary/50 transition-colors">
                    <spec.icon className="w-6 h-6 text-muted-foreground" />
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{spec.label}</div>
                    <div className="font-bold text-foreground">{spec.value}</div>
                  </div>
                ))}
              </div>

              <div className="prose prose-lg text-muted-foreground max-w-none">
                <h3 className="text-foreground">About this project</h3>
                <p className="whitespace-pre-line">{project.description}</p>
              </div>

              {/* Photo Gallery */}
              {galleryPhotos.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-foreground mb-6">Photo Gallery</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {galleryPhotos.map((photo, idx) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedImage(idx)}
                        className="relative rounded-2xl overflow-hidden group cursor-pointer border border-border hover:border-primary/50 transition-all"
                      >
                        <img
                          src={photo.imageUrl}
                          alt={photo.caption || `Gallery photo ${idx + 1}`}
                          className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {photo.caption && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-sm font-medium">{photo.caption}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Inquiry Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-card rounded-3xl p-6 border border-border shadow-xl shadow-primary/5">
                <h3 className="text-xl font-bold mb-2">Interested?</h3>
                <p className="text-muted-foreground mb-6 text-sm">Fill out the form below and our team will get back to you regarding {project.title}.</p>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> Name
                    </label>
                    <input
                      {...form.register("name")}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      placeholder="Your full name"
                    />
                    {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" /> Email
                    </label>
                    <input
                      {...form.register("email")}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      placeholder="name@example.com"
                    />
                    {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" /> Phone
                    </label>
                    <input
                      {...form.register("phone")}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                    {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Message</label>
                    <textarea
                      {...form.register("message")}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none"
                    />
                    {form.formState.errors.message && <p className="text-destructive text-xs">{form.formState.errors.message.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={createInquiry.isPending}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {createInquiry.isPending ? (
                      "Sending..." 
                    ) : (
                      <>
                        Send Inquiry <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-secondary/50 border border-border flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Direct Line</p>
                  <p className="font-bold text-foreground">+1 (555) 123-4567</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
