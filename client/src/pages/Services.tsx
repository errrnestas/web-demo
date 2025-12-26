import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Check } from "lucide-react";

interface ServicePlan {
  id: number;
  name: string;
  description: string;
  price: string;
  features: string[];
}

export default function Services() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['/api/service-plans'],
    queryFn: async () => {
      const res = await fetch('/api/service-plans');
      return res.json();
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20 lg:pl-72">
      <Helmet>
        <title>Construction Services & Pricing | BuildCo</title>
        <meta name="description" content="Explore our construction service packages - from basic to premium. Transparent pricing for your dream home." />
      </Helmet>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 lg:pt-8">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Service Plans & Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            We offer flexible packages tailored to your needs. Choose the perfect plan for your construction project.
          </p>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-3xl h-[500px] animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan: ServicePlan, idx: number) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 ${
                  idx === 1
                    ? 'ring-2 ring-primary lg:scale-105 bg-gradient-to-br from-primary/5 to-primary/10'
                    : 'bg-card border border-border hover:border-primary/50'
                }`}
              >
                {idx === 1 && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-2 rounded-bl-2xl font-bold text-sm">
                    POPULAR
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-6">{plan.description}</p>

                  <div className="mb-8">
                    <div className="text-4xl font-bold text-primary mb-1">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">Estimated project cost</div>
                  </div>

                  <button className={`w-full py-3 rounded-xl font-semibold transition-all mb-8 ${
                    idx === 1
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}>
                    Get Started
                  </button>

                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-foreground uppercase tracking-wide">Features Included</div>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
