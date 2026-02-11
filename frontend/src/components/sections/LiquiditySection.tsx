import { useState } from "react";
import {
  TrendingUp,
  BarChartHorizontal,
  PiggyBank,
  PieChart,
  ExternalLink,
} from "lucide-react";
import { useILIHistory } from "../../hooks/useApi";

export const LiquiditySection = () => {
  const [timeframe, setTimeframe] = useState<"1H" | "24H" | "7D">("24H");
  const { data: _historyData } = useILIHistory();

  // Mock data for the chart - in real app would come from historyData
  const chartData = [
    { time: "00:00", value: 40, label: "$4,200" },
    { time: "04:00", value: 45, label: "$6,100" },
    { time: "08:00", value: 38, label: "$5,800" },
    { time: "12:00", value: 52, label: "$7,500" },
    { time: "16:00", value: 60, label: "$8,200" },
    { time: "20:00", value: 55, label: "$7,100" },
    { time: "23:59", value: 70, label: "$9,800" },
  ];

  const vaultAssets = [
    {
      name: "USDC",
      fullName: "USD Coin",
      balance: "450,000.00",
      weight: 45,
      value: "$450,000.00",
      color: "#0dccf2",
    },
    {
      name: "SOL",
      fullName: "Solana",
      balance: "2,142.85",
      weight: 30,
      value: "$300,000.00",
      color: "#cbd5e1",
    },
    {
      name: "wBTC",
      fullName: "Bitcoin",
      balance: "5.12",
      weight: 15,
      value: "$150,000.00",
      color: "#64748b",
    },
    {
      name: "wETH",
      fullName: "Ethereum",
      balance: "58.82",
      weight: 10,
      value: "$100,000.00",
      color: "#334155",
    },
    {
      name: "USDT",
      fullName: "Tether",
      balance: "0.02",
      weight: 0,
      value: "$0.02",
      color: "#0f766e",
    },
  ];

  return (
    <section id="liquidity" className="py-16 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Vault Analytics
          </h2>
          <h1 className="text-3xl font-light text-white tracking-tight">
            Liquidity & <span className="text-slate-500">Composition</span>
          </h1>
        </div>

        {/* Liquidity Metrics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left: Main Chart (Span 8) */}
          <div className="lg:col-span-8 bg-surface-dark border border-white/10 rounded-lg p-6 flex flex-col h-[420px]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Liquidity Metrics Timeline
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  24h Inter-Liquidity Index (ILI) Trend
                </p>
              </div>
              {/* Timeframe Toggles */}
              <div className="flex bg-background-dark border border-white/10 rounded overflow-hidden">
                {(["1H", "24H", "7D"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      timeframe === tf
                        ? "bg-primary text-background-dark"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Area */}
            <div className="relative flex-1 w-full h-full">
              <svg
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 800 300"
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#ffffff"
                      stopOpacity="0.1"
                    ></stop>
                    <stop
                      offset="100%"
                      stopColor="#ffffff"
                      stopOpacity="0"
                    ></stop>
                  </linearGradient>
                </defs>
                {/* Horizontal Grid Lines */}
                {[0, 75, 150, 225, 300].map((y, i) => (
                  <line
                    key={y}
                    x1="0"
                    x2="800"
                    y1={y}
                    y2={y}
                    stroke="#254045"
                    strokeDasharray="4, 4"
                    strokeWidth="1"
                    opacity={i === 0 || i === 4 ? 1 : 0.5}
                  />
                ))}
                {/* Chart Path */}
                <path
                  d="M0,250 C50,240 100,260 150,220 C200,180 250,200 300,150 C350,100 400,120 450,80 C500,40 550,60 600,100 C650,140 700,120 750,50 L800,40"
                  fill="none"
                  stroke="#94a3b8"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                {/* Area Fill */}
                <path
                  d="M0,250 C50,240 100,260 150,220 C200,180 250,200 300,150 C350,100 400,120 450,80 C500,40 550,60 600,100 C650,140 700,120 750,50 L800,40 L800,300 L0,300 Z"
                  fill="url(#chartFill)"
                />
                {/* Active Point Indicator */}
                <circle
                  cx="600"
                  cy="100"
                  fill="#0dccf2"
                  r="4"
                  stroke="#101f22"
                  strokeWidth="2"
                ></circle>
                <line
                  opacity="0.5"
                  stroke="#0dccf2"
                  strokeDasharray="2,2"
                  strokeWidth="1"
                  x1="600"
                  x2="600"
                  y1="100"
                  y2="300"
                ></line>
              </svg>

              {/* Tooltip Overlay */}
              <div className="absolute top-[25%] left-[75%] transform -translate-x-1/2 bg-background-dark border border-primary/30 p-2 rounded shadow-xl backdrop-blur-sm bg-opacity-90">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Current ILI
                  </span>
                </div>
                <div className="text-lg font-mono text-white font-bold leading-none">
                  0.8924
                </div>
              </div>
            </div>

            {/* X Axis Labels */}
            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono uppercase">
              {chartData.map((d) => (
                <span key={d.time}>{d.time}</span>
              ))}
            </div>
          </div>

          {/* Right: Metric Mini Cards (Span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-4 h-[420px]">
            {/* Card 1: Avg Yield */}
            <div className="flex-1 bg-surface-dark border border-white/10 rounded-lg p-5 flex flex-col justify-between group hover:border-primary/50 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">
                  Avg Yield (APY)
                </span>
                <TrendingUp className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-1">4.2%</div>
                <div className="text-xs font-mono text-primary flex items-center gap-1">
                  <span className="text-[10px]">↑</span>
                  0.45% vs 24h
                </div>
              </div>
            </div>

            {/* Card 2: Volatility */}
            <div className="flex-1 bg-surface-dark border border-white/10 rounded-lg p-5 flex flex-col justify-between group hover:border-primary/50 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">
                  Volatility Index
                </span>
                <BarChartHorizontal className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-1">0.85</div>
                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="bg-emerald-400/10 px-1 rounded text-[10px] uppercase">
                    Low Risk
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Normalized TVL */}
            <div className="flex-1 bg-surface-dark border border-white/10 rounded-lg p-5 flex flex-col justify-between group hover:border-primary/50 transition-colors cursor-default">
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 uppercase font-medium tracking-wider">
                  Normalized TVL
                </span>
                <PiggyBank className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-1">
                  $14.5M
                </div>
                <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
                  Stable across pools
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reserve Vault Composition Section */}
        <div className="bg-surface-dark border border-white/10 rounded-lg overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center bg-white/[0.03]">
            <h3 className="text-sm font-medium text-white uppercase tracking-wide flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Reserve Vault Composition
            </h3>
            <button className="text-xs text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/10 transition-colors uppercase font-mono flex items-center gap-1">
              View Contract
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left: Donut Chart Visualization (Span 5) */}
            <div className="md:col-span-5 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 relative bg-gradient-to-br from-surface-dark to-background-dark">
              <div className="relative w-64 h-64">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  {/* Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    fill="transparent"
                    r="40"
                    stroke="#1c3237"
                    strokeWidth="12"
                  ></circle>
                  {/* Segments */}
                  {vaultAssets.slice(0, 4).map((asset, idx) => {
                    const circumference = 2 * Math.PI * 40;
                    const offset =
                      idx === 0
                        ? 0
                        : vaultAssets
                            .slice(0, idx)
                            .reduce(
                              (acc, a) =>
                                acc + (a.weight / 100) * circumference,
                              0,
                            );
                    return (
                      <circle
                        key={asset.name}
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke={asset.color}
                        strokeDasharray={`${(asset.weight / 100) * circumference} ${circumference}`}
                        strokeDashoffset={-offset}
                        strokeWidth="12"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  })}
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Total Value
                  </span>
                  <span className="text-2xl font-bold text-white tracking-tighter tabular-nums">
                    $1.00M
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-6 text-xs font-mono">
                {vaultAssets.slice(0, 4).map((asset) => (
                  <div key={asset.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: asset.color }}
                    ></span>
                    <span className="text-slate-300">{asset.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: High Density Table (Span 7) */}
            <div className="md:col-span-7 bg-surface-dark">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10 bg-white/[0.03]">
                      <th className="px-6 py-3 font-medium">Asset Name</th>
                      <th className="px-6 py-3 font-medium text-right">
                        Balance
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        Weight (%)
                      </th>
                      <th className="px-6 py-3 font-medium text-right">
                        Value ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono text-slate-300">
                    {vaultAssets.map((asset, idx) => (
                      <tr
                        key={asset.name}
                        className={`hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 group ${idx % 2 === 0 ? "bg-white/[0.02]" : ""} ${asset.weight < 1 ? "opacity-60" : ""}`}
                      >
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{ backgroundColor: asset.color }}
                          >
                            {asset.name[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold group-hover:text-primary transition-colors">
                              {asset.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {asset.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums">
                          {asset.balance}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums">
                          <div className="inline-block w-16 h-1.5 bg-background-dark rounded-full overflow-hidden align-middle mr-2">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.max(asset.weight, 2)}%` }}
                            ></div>
                          </div>
                          {asset.weight}%
                        </td>
                        <td className="px-6 py-4 text-right text-white font-medium tabular-nums">
                          {asset.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
