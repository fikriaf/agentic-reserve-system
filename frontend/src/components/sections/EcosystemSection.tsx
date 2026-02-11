import { useState } from "react";
import {
  History,
  TrendingUp,
  ArrowUpRight,
  Timer,
  Clock,
  Wallet,
  Percent,
  Activity,
} from "lucide-react";
import { useRevenue } from "../../hooks/useApi";

export const EcosystemSection = () => {
  const { data: revenueData, isLoading: revenueLoading } = useRevenue();
  const [revenueTimeframe, setRevenueTimeframe] = useState<
    "30D" | "90D" | "YTD"
  >("30D");

  // Mock activity feed data
  const activities = [
    {
      type: "Shielded Transfer",
      time: "Just now",
      address: "0x8a...4f2b",
      amount: "1,250 ARS",
      color: "text-primary",
    },
    {
      type: "Token Swap",
      time: "2s ago",
      address: "0x4c...9e1a",
      amount: "500 USDC → ARS",
      color: "text-emerald-400",
    },
    {
      type: "Node Stake",
      time: "15s ago",
      address: "Agent-102",
      amount: "+5,000 ARU",
      color: "text-primary",
    },
    {
      type: "Shielded Transfer",
      time: "42s ago",
      address: "0x1b...cc88",
      amount: "250 ARS",
      color: "text-primary",
    },
    {
      type: "Token Swap",
      time: "1m ago",
      address: "0x99...aa12",
      amount: "1.2 ETH → ARS",
      color: "text-emerald-400",
    },
  ];

  // Mock revenue chart data
  const revenueData_points = [30, 45, 40, 55, 60, 50, 70, 75, 65, 85, 95];

  // Mock governance proposals
  const proposals = [
    {
      id: "GP-12",
      title: "Adjust Agent Slashing Parameters",
      description:
        "Proposal to increase the slashing penalty for malicious agent behavior from 5% to 8% to enhance network security.",
      status: "ACTIVE",
      yesPercent: 80,
      noPercent: 20,
      quorum: 42,
      endsIn: "14h 20m 12s",
    },
    {
      id: "GP-13",
      title: "Integrate Layer-2 Bridge Support",
      description:
        "Technical specification for deploying ARS protocol bridge contracts on Optimism and Arbitrum networks.",
      status: "PENDING QUEUE",
      yesPercent: 0,
      noPercent: 0,
      quorum: 0,
      endsIn: "2d 04h 00m",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <section id="ecosystem" className="py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Network Overview
          </h2>
          <h1 className="text-3xl font-light text-white tracking-tight">
            Ecosystem & <span className="text-slate-500">Revenue</span>
          </h1>
        </div>

        {/* Agent Ecosystem Overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-wide uppercase text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-primary"></span>
              Agent Ecosystem Overview
            </h2>
            <div className="flex items-center gap-2 text-xs text-primary/80 bg-primary/10 px-3 py-1 rounded border border-primary/20">
              <div className="relative w-3 h-3 mr-2">
                <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping"></div>
                <div className="absolute inset-0 bg-primary rounded-full"></div>
              </div>
              SYSTEM OPERATIONAL
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric Card 1: Total Agents */}
            <div className="bg-surface-dark border border-white/10 rounded-lg p-5 hover:border-primary/50 transition-colors group">
              <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">
                Total Agents
              </div>
              <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">
                {revenueLoading
                  ? "—"
                  : revenueData?.agentCount
                    ? (revenueData.agentCount * 5).toLocaleString()
                    : "1,248"}
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12 this week
              </div>
            </div>

            {/* Metric Card 2: Active Now */}
            <div className="bg-surface-dark border border-white/10 rounded-lg p-5 hover:border-primary/50 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
              <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider flex items-center gap-2">
                Active Now
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
              <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">
                {revenueLoading
                  ? "—"
                  : revenueData?.agentCount
                    ? Math.floor(revenueData.agentCount * 3.5).toLocaleString()
                    : "842"}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                67% Utilization Rate
              </div>
            </div>

            {/* Metric Card 3: 24h Fees */}
            <div className="bg-surface-dark border border-white/10 rounded-lg p-5 hover:border-primary/50 transition-colors group">
              <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">
                24h Fees
              </div>
              <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">
                {revenueLoading
                  ? "—"
                  : formatCurrency(revenueData?.daily || 142390)}
              </div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +5.4% vs yesterday
              </div>
            </div>

            {/* Metric Card 4: Staked ARU */}
            <div className="bg-surface-dark border border-white/10 rounded-lg p-5 hover:border-primary/50 transition-colors group">
              <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">
                Staked ARU
              </div>
              <div className="text-3xl font-bold text-white group-hover:text-primary transition-colors">
                4.2M
              </div>
              <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: "78%" }}
                ></div>
              </div>
              <div className="text-xs text-slate-500 mt-1 text-right">
                78% of Supply
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed & Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column: Activity Feed (Span 4) */}
          <div className="lg:col-span-4 flex flex-col h-full bg-surface-dark border border-white/10 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
              <h3 className="font-semibold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Live Activity Feed
              </h3>
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                REAL-TIME
              </span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-2 relative">
              {/* Gradient overlay for bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface-dark to-transparent pointer-events-none z-10"></div>

              {activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="bg-background-dark/50 border border-white/5 p-3 rounded hover:border-primary/30 transition-all group cursor-default"
                  style={{ opacity: 1 - idx * 0.15 }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`${activity.color} text-xs font-bold uppercase`}
                    >
                      {activity.type}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {activity.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-300 font-mono text-xs">
                      {activity.address}
                    </span>
                    <span className="text-white font-medium">
                      {activity.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Revenue & Economics (Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Revenue Chart Card */}
            <div className="bg-surface-dark border border-white/10 rounded-lg p-6 relative">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white uppercase tracking-wider">
                    Protocol Revenue
                  </h3>
                  <p className="text-sm text-slate-500">
                    Daily revenue accumulation (30D)
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["30D", "90D", "YTD"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setRevenueTimeframe(tf)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        revenueTimeframe === tf
                          ? "bg-primary text-background-dark"
                          : "text-slate-400 bg-white/5 border border-white/10 hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 w-full relative flex items-end gap-1 overflow-hidden">
                {/* Y-Axis Lines */}
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-600 pointer-events-none z-0">
                  {["15k", "10k", "5k", "0"].map((label) => (
                    <div
                      key={label}
                      className="border-b border-white/5 w-full h-0 pb-2"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Chart Bars */}
                <div className="w-full h-full flex items-end justify-between gap-1 z-10 px-4 pb-2">
                  {revenueData_points.map((height, idx) => (
                    <div
                      key={idx}
                      className="w-1/12 bg-primary/20 rounded-t-sm hover:bg-primary/40 transition-all relative group"
                      style={{
                        height: `${height}%`,
                        backgroundColor: `rgba(13, 204, 242, ${0.2 + idx * 0.07})`,
                        boxShadow:
                          idx === revenueData_points.length - 1
                            ? "0 0 15px rgba(13,204,242,0.5)"
                            : undefined,
                      }}
                    >
                      <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background-dark border border-primary text-primary text-xs px-2 py-1 rounded whitespace-nowrap">
                        ${(height * 150).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Projection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-dark border border-white/10 rounded-lg p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Projected Annual Revenue
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {revenueLoading
                      ? "—"
                      : formatCurrency(revenueData?.annual || 547500)}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-surface-dark border border-white/10 rounded-lg p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                    Current Staking APY
                  </p>
                  <p className="text-2xl font-bold text-white">12.4%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Governance Snapshot */}
        <div>
          <h2 className="text-xl font-semibold tracking-wide uppercase text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-slate-500"></span>
            Governance Snapshot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-surface-dark border border-white/10 rounded-lg p-6 relative overflow-hidden group hover:border-white/30 transition-colors"
              >
                <div className="absolute top-0 right-0 p-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                      proposal.status === "ACTIVE"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-slate-700/50 text-slate-300 border-slate-600/50"
                    }`}
                  >
                    {proposal.status}
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-xs font-mono text-slate-500 mb-1 block">
                    {proposal.id}
                  </span>
                  <h3 className="text-lg font-medium text-white group-hover:text-primary transition-colors">
                    {proposal.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                    {proposal.description}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
                    <span>Votes (For/Against)</span>
                    <span>Total Quorum: {proposal.quorum}%</span>
                  </div>
                  <div className="flex h-3 w-full bg-white/5 rounded overflow-hidden">
                    {proposal.yesPercent > 0 && (
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${proposal.yesPercent}%` }}
                      ></div>
                    )}
                    {proposal.noPercent > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${proposal.noPercent}%` }}
                      ></div>
                    )}
                    {proposal.yesPercent === 0 && proposal.noPercent === 0 && (
                      <div className="bg-slate-700 h-full w-full"></div>
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400">
                      {proposal.yesPercent}% YES
                    </span>
                    <span className="text-rose-400">
                      {proposal.noPercent}% NO
                    </span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-500">
                  {proposal.status === "ACTIVE" ? (
                    <Timer className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {proposal.status === "ACTIVE" ? "Ends in:" : "Starts in:"}{" "}
                  <span className="text-white font-mono">
                    {proposal.endsIn}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="border-t border-white/10 pt-8 pb-4 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-500">ARS PROTOCOL</span>
              <span>v2.4.1-beta</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                All Systems Normal
              </span>
            </div>
            <div className="flex gap-6">
              <a className="hover:text-primary transition-colors" href="#">
                Documentation
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Terms of Service
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Privacy Policy
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                GitHub
              </a>
            </div>
          </div>
          <div className="text-center mt-6 text-[10px] text-slate-700 font-mono">
            BLOCK: 18,242,901 | GAS: 12 GWEI | UTC:{" "}
            {new Date().toISOString().replace("T", " ").slice(0, 19)}
          </div>
        </footer>
      </div>
    </section>
  );
};
