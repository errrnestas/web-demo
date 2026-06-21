import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { HelmetProvider } from "react-helmet-async";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import HomeDesigner from "@/pages/HomeDesigner";
import ProjectDetails from "@/pages/ProjectDetails";
import Services from "@/pages/Services";
import Guides from "@/pages/Guides";
import GuideDetails from "@/pages/GuideDetails";
import About from "@/pages/About";
import Contact from "@/pages/Contact";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/designer" component={HomeDesigner} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/services" component={Services} />
      <Route path="/guides" component={Guides} />
      <Route path="/guides/:id" component={GuideDetails} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <Router />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
