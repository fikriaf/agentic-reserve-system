import { Moon, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

interface NavbarProps {
  isOperational?: boolean;
}

export const Navbar = ({ isOperational = true }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-background-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo/logo_white_transparent.png"
              alt="ARS Logo"
              className="h-8 w-auto object-contain group-hover:opacity-80 transition-opacity"
            />
            <span className="text-xl font-bold tracking-tighter">
              ARS.SYSTEM
            </span>
          </Link>
          <div className="hidden md:flex gap-6 text-xs uppercase tracking-widest text-white/50">
            <Link
              to="/reserve-hub"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Reserve Hub
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Documentation
            </a>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 border border-primary/40 bg-primary/5">
            <div
              className={`w-1.5 h-1.5 rounded-full status-pulse ${isOperational ? "bg-primary" : "bg-red-500"}`}
            ></div>
            <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">
              {isOperational ? "System Operational" : "System Degraded"}
            </span>
          </div>
          <button className="text-white/40 hover:text-white">
            <Moon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
