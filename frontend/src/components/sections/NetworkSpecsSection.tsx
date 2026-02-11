export const NetworkSpecsSection = () => {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 border-b border-white/10 pb-8 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-bold tracking-tight uppercase">
              Network Protocol
            </h2>
            <p className="text-white/40 mt-2">v4.0.2 Stable-Release</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 uppercase tracking-widest">
              Last Update
            </div>
            <div className="font-mono text-sm">2023-11-24T12:04:01Z</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-4">
              Latency
            </div>
            <div className="text-2xl font-bold mb-2">400ms</div>
            <p className="text-xs text-white/40 leading-relaxed">
              Average transaction finality across the global validator network.
            </p>
          </div>
          <div>
            <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-4">
              Throughput
            </div>
            <div className="text-2xl font-bold mb-2">65k TPS</div>
            <p className="text-xs text-white/40 leading-relaxed">
              Peak theoretical capacity optimized for high-frequency reserve
              adjustments.
            </p>
          </div>
          <div>
            <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-4">
              Compliance
            </div>
            <div className="text-2xl font-bold mb-2">SOC2 Type II</div>
            <p className="text-xs text-white/40 leading-relaxed">
              Institutional grade security frameworks integrated at the protocol
              layer.
            </p>
          </div>
          <div>
            <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-4">
              Governance
            </div>
            <div className="text-2xl font-bold mb-2">Multi-Sig</div>
            <p className="text-xs text-white/40 leading-relaxed">
              Quorum-based parameter adjustments for maximum system safety.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
