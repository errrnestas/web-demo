import { Navigation } from "@/components/Navigation";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Trophy, Users, History } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>About Us - BuildCo</title>
        <meta name="description" content="Learn about BuildCo's history, values, and commitment to quality home construction." />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">Building Dreams, <br className="hidden md:block" />One Home at a Time</h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Founded in 2010, BuildCo has established itself as the premier partner for individual home construction. We combine traditional craftsmanship with modern innovation.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {[
              { icon: History, value: "14+", label: "Years Experience" },
              { icon: CheckCircle2, value: "500+", label: "Homes Built" },
              { icon: Users, value: "50+", label: "Team Members" },
              { icon: Trophy, value: "12", label: "Industry Awards" },
            ].map((stat, i) => (
              <div key={i} className="bg-card p-6 rounded-2xl border border-border shadow-sm text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-16">
            <section className="flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Our mission is to simplify the home building process. We believe transparency, quality, and communication are the pillars of a successful project. From the first blueprint to the final handover, we are with you every step of the way.
                </p>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl transform translate-x-4 translate-y-4"></div>
                {/* Unsplash image: construction site or team meeting */}
                <img 
                  src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80" 
                  alt="Construction meeting"
                  className="relative rounded-3xl shadow-xl w-full h-[300px] object-cover"
                />
              </div>
            </section>

            <section className="flex flex-col md:flex-row-reverse gap-12 items-center">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Quality Guarantee</h2>
                <ul className="space-y-4">
                  {[
                    "10-Year Structural Warranty",
                    "Premium Materials Standard",
                    "Certified & Insured Contractors",
                    "Regular Site Inspections"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-lg text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-accent/20 rounded-3xl transform -translate-x-4 translate-y-4"></div>
                {/* Unsplash image: finished modern interior */}
                <img 
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80" 
                  alt="Quality interior"
                  className="relative rounded-3xl shadow-xl w-full h-[300px] object-cover"
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
