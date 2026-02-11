export const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-12 bg-black">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-[10px] text-white/20 uppercase tracking-[0.4em]">
          © 2024 AGENTIC RESERVE SYSTEM. ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-8">
          <a
            href="#"
            className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest"
          >
            Privacy
          </a>
          <a
            href="#"
            className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest"
          >
            Terms
          </a>
          <a
            href="#"
            className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest"
          >
            GitHub
          </a>
          <a
            href="#"
            className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest"
          >
            Twitter/X
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 uppercase tracking-widest">
            Powered by
          </span>
          <svg
            className="h-3 opacity-30 grayscale brightness-200"
            viewBox="0 0 48 48"
            fill="currentColor"
          >
            <path d="M13.2 31.6l-4 6.8c-.4.8.2 1.6 1 1.6h17.6c6.4 0 11.6-5.2 11.6-11.6 0-4.2-2.2-7.8-5.6-9.8L28 8.2c-.6-.4-1.4-.2-1.8.4l-3.2 5.4c-.4.6-.2 1.4.4 1.8l3.6 2.2c1.8 1 3 3 3 5.2 0 3.2-2.6 5.8-5.8 5.8h-7.6c-.8 0-1.4-.6-1-1.4z" />
          </svg>
        </div>
      </div>
    </footer>
  );
};
