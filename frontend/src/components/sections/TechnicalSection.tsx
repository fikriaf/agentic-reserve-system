import { useHealth } from "../../hooks/useApi";
import { Terminal } from "lucide-react";

export const TechnicalSection = () => {
  const { data: healthData, isLoading } = useHealth();

  const cacheHitRate =
    healthData?.metrics?.performance?.cacheHitRate || "99.98%";
  const errorRate = healthData?.metrics?.performance?.errorRate || "0.001%";

  // Parse percentage numbers
  const cacheNum = parseFloat(cacheHitRate);
  const errorNum = parseFloat(errorRate);

  return (
    <section className="py-24 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-24">
        {/* Vertical Timeline */}
        <div>
          <h2 className="text-xs font-bold text-primary uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
            <span className="w-8 h-px bg-primary"></span> Core Architecture
          </h2>
          <div className="space-y-0">
            <div className="relative pl-12 pb-16 border-l border-white/10">
              <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] bg-white"></div>
              <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">
                01. Data Ingestion
              </h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-md">
                Real-time indexing of Solana chain-state. Monitoring liquidity
                pools, order books, and lending protocols with sub-second
                latency.
              </p>
            </div>
            <div className="relative pl-12 pb-16 border-l border-white/10">
              <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] border border-white bg-background-dark"></div>
              <h3 className="text-xl font-bold mb-4 uppercase tracking-tight text-white/60">
                02. Agentic Validation
              </h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-md">
                Decentralized validator agents simulate reserve outcomes across
                1,000+ scenarios before consensus on-chain execution.
              </p>
            </div>
            <div className="relative pl-12 border-l border-white/10">
              <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] border border-white bg-background-dark"></div>
              <h3 className="text-xl font-bold mb-4 uppercase tracking-tight text-white/60">
                03. Reserve Allocation
              </h3>
              <p className="text-white/40 text-sm leading-relaxed max-w-md">
                Automated smart contract triggers execute rebalancing across the
                Solana ecosystem to maintain institutional peg stability.
              </p>
            </div>
          </div>
        </div>

        {/* Health Cards */}
        <div className="space-y-8">
          <div className="p-8 border border-white/10 bg-white/[0.02]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest">
                System Health
              </h3>
              <span className="text-[10px] px-2 py-1 border border-white/20">
                REFRESHING IN 2s
              </span>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div className="text-3xl font-bold mb-1">
                  {isLoading ? "—" : cacheNum}
                  <span className="text-sm font-light text-white/40">%</span>
                </div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest">
                  Cache Hit Rate
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">
                  {isLoading ? "—" : errorNum}
                  <span className="text-sm font-light text-white/40">%</span>
                </div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest">
                  Error Rate
                </div>
              </div>
            </div>

            {/* Grayscale Chart Simulation */}
            <div className="relative h-32 border-t border-white/10 pt-4">
              <div className="absolute bottom-0 left-0 w-full h-24 flex items-end gap-1 opacity-40">
                {[
                  40, 45, 38, 52, 60, 55, 65, 72, 68, 80, 90, 85, 95, 100, 92,
                  88,
                ].map((height, i) => (
                  <div
                    key={i}
                    className="bg-white w-full"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
              <div className="relative z-10 text-[10px] text-white/20 uppercase tracking-widest">
                Aggregate Node Performance
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0 border border-white/10">
            <button className="p-6 bg-white text-black font-bold uppercase text-xs tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-3">
              API Console <Terminal className="w-4 h-4" />
            </button>
            <button className="p-6 border-l border-white/10 font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all">
              View Explorer
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
