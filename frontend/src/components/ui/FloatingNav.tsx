import { useState, useEffect } from "react";
import { Activity, Droplets, Users, ChevronUp } from "lucide-react";

interface FloatingNavProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

export const FloatingNav = ({
  activeSection,
  onNavigate,
}: FloatingNavProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling past hero
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "system-pulse", label: "System", icon: Activity, color: "#0dccf2" },
    { id: "liquidity", label: "Liquidity", icon: Droplets, color: "#22c55e" },
    { id: "ecosystem", label: "Ecosystem", icon: Users, color: "#f59e0b" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Floating Navigation Dock - Right Side */}
      <div
        className={`fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 transition-all duration-500 ${
          isVisible
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-10 pointer-events-none"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex items-center justify-center w-12 h-12 rounded-full border transition-all duration-300 ${
                isActive
                  ? "bg-surface-dark border-primary shadow-[0_0_20px_rgba(13,204,242,0.3)]"
                  : "bg-background-dark/80 border-white/10 hover:border-white/30"
              }`}
              style={{
                boxShadow: isActive ? `0 0 20px ${item.color}40` : undefined,
              }}
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: isActive ? item.color : "#94a3b8" }}
              />

              {/* Label tooltip */}
              <span
                className="absolute right-full mr-3 px-3 py-1.5 bg-surface-dark border border-white/10 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: item.color }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Scroll to top button */}
        <button
          onClick={scrollToTop}
          className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-background-dark/80 hover:border-white/30 transition-all mt-4"
        >
          <ChevronUp className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Section indicators - Bottom horizontal bar on mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex md:hidden gap-2 px-4 py-2 bg-background-dark/90 backdrop-blur-sm border border-white/10 rounded-full">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-2 h-2 rounded-full transition-all ${
                isActive ? "w-6" : ""
              }`}
              style={{ backgroundColor: isActive ? item.color : "#334155" }}
            />
          );
        })}
      </div>
    </>
  );
};
