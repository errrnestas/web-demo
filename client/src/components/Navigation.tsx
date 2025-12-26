import { Link, useLocation } from "wouter";
import { Home, Info, Mail, Phone, Menu, X, Zap, BookOpen } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Projects", icon: Home },
    { href: "/services", label: "Services", icon: Zap },
    { href: "/guides", label: "Guides", icon: BookOpen },
    { href: "/about", label: "About Us", icon: Info },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-4">
        <Link href="/" className="font-display font-bold text-xl text-primary flex items-center gap-2">
          {/* logo icon placeholder */}
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <Home className="w-5 h-5" />
          </div>
          BuildCo
        </Link>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden fixed inset-0 top-16 bg-background z-40 p-4"
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div 
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-lg transition-all
                      ${isActive(item.href) 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              ))}
            </nav>
            
            <div className="mt-8 p-4 bg-muted/50 rounded-2xl">
              <h4 className="font-semibold mb-2">Need Help?</h4>
              <a href="tel:+1234567890" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="w-4 h-4" /> (555) 123-4567
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex-col p-6 z-50">
        <Link href="/" className="font-display font-bold text-2xl text-primary flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Home className="w-6 h-6" />
          </div>
          BuildCo
        </Link>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer group
                ${isActive(item.href) 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"}
              `}>
                <item.icon className={`w-5 h-5 ${isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="p-5 bg-gradient-to-br from-muted to-background rounded-2xl border border-border">
            <h4 className="font-display font-bold text-foreground mb-1">Get a Quote</h4>
            <p className="text-sm text-muted-foreground mb-3">Ready to build your dream home?</p>
            <Link href="/contact">
              <div className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline cursor-pointer">
                Contact Sales →
              </div>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
