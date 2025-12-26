import { Navigation } from "@/components/Navigation";
import { Helmet } from "react-helmet-async";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateInquiry } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import { insertInquirySchema } from "@shared/schema";

const contactFormSchema = insertInquirySchema.omit({ projectId: true }).extend({
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Phone number is too short"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const { toast } = useToast();
  const createInquiry = useCreateInquiry();

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    }
  });

  const onSubmit = (data: ContactForm) => {
    // Send without projectId for general inquiries
    createInquiry.mutate({ ...data, projectId: undefined }, {
      onSuccess: () => {
        toast({
          title: "Message Sent!",
          description: "Thank you for contacting us.",
        });
        form.reset();
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>Contact Us - BuildCo</title>
        <meta name="description" content="Get in touch with BuildCo for your construction needs. Phone, email, or visit our office." />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-foreground mb-4">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about a project or want to start building? We're here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
              <h3 className="text-xl font-bold mb-6">Contact Information</h3>
              <div className="space-y-6">
                {[
                  { icon: Phone, title: "Phone", content: "+1 (555) 123-4567" },
                  { icon: Mail, title: "Email", content: "hello@buildco.com" },
                  { icon: MapPin, title: "Office", content: "123 Construction Ave, Suite 100\nCityville, ST 12345" },
                  { icon: Clock, title: "Hours", content: "Mon-Fri: 9am - 6pm\nSat: 10am - 2pm" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground whitespace-pre-line">{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Map Placeholder */}
            <div className="h-64 bg-muted rounded-3xl border border-border flex items-center justify-center">
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Map Integration Placeholder
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-3xl p-8 border border-border shadow-xl shadow-primary/5">
            <h3 className="text-xl font-bold mb-6">Send us a Message</h3>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <input
                    {...form.register("name")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Your name"
                  />
                  {form.formState.errors.name && <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <input
                    {...form.register("phone")}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="Phone number"
                  />
                  {form.formState.errors.phone && <p className="text-destructive text-xs">{form.formState.errors.phone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  {...form.register("email")}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="Email address"
                />
                {form.formState.errors.email && <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                  {...form.register("message")}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none"
                  placeholder="How can we help you?"
                />
                {form.formState.errors.message && <p className="text-destructive text-xs">{form.formState.errors.message.message}</p>}
              </div>

              <button
                type="submit"
                disabled={createInquiry.isPending}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {createInquiry.isPending ? "Sending..." : "Send Message"}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
