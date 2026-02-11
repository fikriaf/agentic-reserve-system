import { useState } from "react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
} from "lucide-react";

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  category: string;
}

const apiEndpoints: ApiEndpoint[] = [
  // Health & Monitoring
  {
    method: "GET",
    path: "/health",
    description: "Simple health check (fast)",
    category: "Health",
  },
  {
    method: "GET",
    path: "/api/v1/health",
    description: "Health check with dependency status",
    category: "Health",
  },
  {
    method: "GET",
    path: "/api/v1/health/sak",
    description: "Detailed SAK integration health",
    category: "Health",
  },

  // ILI
  {
    method: "GET",
    path: "/api/v1/ili/current",
    description: "Get current ILI value",
    category: "ILI",
  },
  {
    method: "GET",
    path: "/api/v1/ili/history",
    description: "Get ILI historical data",
    category: "ILI",
  },

  // ICR
  {
    method: "GET",
    path: "/api/v1/icr/current",
    description: "Get current Internet Credit Rate",
    category: "ICR",
  },

  // Reserve Vault
  {
    method: "GET",
    path: "/api/v1/reserve/state",
    description: "Get current reserve vault state",
    category: "Reserve",
  },
  {
    method: "GET",
    path: "/api/v1/reserve/history",
    description: "Get rebalance history",
    category: "Reserve",
  },

  // Agents
  {
    method: "GET",
    path: "/api/v1/agents/:pubkey/fees",
    description: "Get agent fee history",
    category: "Agents",
  },
  {
    method: "GET",
    path: "/api/v1/agents/:pubkey/staking",
    description: "Get agent staking status",
    category: "Agents",
  },
  {
    method: "POST",
    path: "/api/v1/agents/:pubkey/stake",
    description: "Stake ARU tokens",
    category: "Agents",
  },
  {
    method: "POST",
    path: "/api/v1/agents/:pubkey/claim",
    description: "Claim staking rewards",
    category: "Agents",
  },

  // Privacy Phase 1
  {
    method: "POST",
    path: "/api/v1/privacy/stealth-address",
    description: "Generate stealth meta-address",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/stealth-address/:agentId",
    description: "Get agent's meta-address",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/shielded-transfer",
    description: "Build shielded transfer",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/shielded-transfer/submit",
    description: "Submit signed transaction",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/payments/:agentId",
    description: "Get detected payments for agent",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/claim",
    description: "Claim stealth payment",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/transactions/:agentId",
    description: "Get transaction history",
    category: "Privacy",
  },

  // Privacy Phase 2
  {
    method: "POST",
    path: "/api/v1/privacy/commitment",
    description: "Create Pedersen commitment",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/commitment/verify",
    description: "Verify commitment opening",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/commitment/add",
    description: "Add two commitments homomorphically",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/score/:address",
    description: "Get privacy score for address",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/score/:address/trend",
    description: "Get privacy score trend",
    category: "Privacy",
  },
  {
    method: "POST",
    path: "/api/v1/privacy/protected-swap",
    description: "Execute MEV-protected swap",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/mev-metrics/:vaultId",
    description: "Get MEV metrics for vault",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/low-privacy-addresses",
    description: "Get addresses with low privacy scores",
    category: "Privacy",
  },
  {
    method: "GET",
    path: "/api/v1/privacy/scanner/stats",
    description: "Get payment scanner statistics",
    category: "Privacy",
  },

  // Compliance
  {
    method: "POST",
    path: "/api/v1/compliance/viewing-key/generate",
    description: "Generate master viewing key",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/viewing-key/derive",
    description: "Derive child viewing key",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/viewing-key/verify",
    description: "Verify viewing key hierarchy",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/disclose",
    description: "Disclose transaction to auditor",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/decrypt",
    description: "Decrypt disclosed transaction",
    category: "Compliance",
  },
  {
    method: "GET",
    path: "/api/v1/compliance/disclosures/:auditorId",
    description: "List disclosures for auditor",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/report",
    description: "Generate compliance report",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/master-key/approve",
    description: "Multi-sig master key approval",
    category: "Compliance",
  },
  {
    method: "GET",
    path: "/api/v1/compliance/master-key/status/:requestId",
    description: "Check approval status",
    category: "Compliance",
  },
  {
    method: "POST",
    path: "/api/v1/compliance/setup",
    description: "Setup complete viewing key hierarchy",
    category: "Compliance",
  },

  // Memory & Analytics
  {
    method: "GET",
    path: "/api/v1/memory/transactions/:walletAddress",
    description: "Get transaction history",
    category: "Memory",
  },
  {
    method: "GET",
    path: "/api/v1/memory/balances/:walletAddress",
    description: "Get wallet balances",
    category: "Memory",
  },
  {
    method: "GET",
    path: "/api/v1/memory/pnl/:walletAddress",
    description: "Get PnL analytics",
    category: "Memory",
  },
  {
    method: "GET",
    path: "/api/v1/memory/risk/:walletAddress",
    description: "Get risk profile",
    category: "Memory",
  },
  {
    method: "GET",
    path: "/api/v1/memory/prediction-markets/:marketId",
    description: "Get prediction market data",
    category: "Memory",
  },
  {
    method: "GET",
    path: "/api/v1/memory/portfolio/:walletAddress",
    description: "Get portfolio analytics",
    category: "Memory",
  },

  // Metrics
  {
    method: "GET",
    path: "/api/v1/metrics",
    description: "Prometheus metrics endpoint",
    category: "Metrics",
  },
  {
    method: "GET",
    path: "/api/v1/metrics/json",
    description: "JSON metrics (debugging)",
    category: "Metrics",
  },

  // Slow Queries
  {
    method: "GET",
    path: "/api/v1/slow-queries/stats",
    description: "Get slow query statistics",
    category: "Queries",
  },
  {
    method: "GET",
    path: "/api/v1/slow-queries/recent",
    description: "Get recent slow queries",
    category: "Queries",
  },
  {
    method: "DELETE",
    path: "/api/v1/slow-queries/history",
    description: "Clear slow query history",
    category: "Queries",
  },

  // Governance
  {
    method: "GET",
    path: "/api/v1/proposals",
    description: "List proposals",
    category: "Governance",
  },
  {
    method: "GET",
    path: "/api/v1/proposals/:id",
    description: "Get proposal details with votes",
    category: "Governance",
  },

  // Revenue
  {
    method: "GET",
    path: "/api/v1/revenue/current",
    description: "Current revenue metrics",
    category: "Revenue",
  },
  {
    method: "GET",
    path: "/api/v1/revenue/history",
    description: "Historical revenue data",
    category: "Revenue",
  },
  {
    method: "GET",
    path: "/api/v1/revenue/projections",
    description: "Revenue projections by agent count",
    category: "Revenue",
  },
  {
    method: "GET",
    path: "/api/v1/revenue/breakdown",
    description: "Fee breakdown by type",
    category: "Revenue",
  },
  {
    method: "GET",
    path: "/api/v1/revenue/distributions",
    description: "Distribution history",
    category: "Revenue",
  },

  // Programs
  {
    method: "GET",
    path: "/api/v1/programs/status",
    description: "Check program deployment status",
    category: "Programs",
  },
  {
    method: "GET",
    path: "/api/v1/programs/core/state",
    description: "Get GlobalState from ars_core",
    category: "Programs",
  },
  {
    method: "GET",
    path: "/api/v1/programs/reserve/vault",
    description: "Get Vault state from ars_reserve",
    category: "Programs",
  },
  {
    method: "GET",
    path: "/api/v1/programs/token/mint",
    description: "Get Token mint info from ars_token",
    category: "Programs",
  },
];

export const ApiDocumentationPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [...new Set(apiEndpoints.map((ep) => ep.category))].sort();

  const filteredEndpoints = apiEndpoints.filter((ep) => {
    const matchesCategory = selectedCategory
      ? ep.category === selectedCategory
      : true;
    const matchesSearch = searchQuery
      ? ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleCopy = async () => {
    const curlCommand = `curl -s ${window.location.origin}/ars-llms.txt`;
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-white/10 bg-white/[0.02] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-white">
              API Documentation
            </h3>
            <p className="text-xs text-white/40">
              {apiEndpoints.length} endpoints • LLM Context
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 hover:border-primary/50 hover:text-primary transition-colors rounded"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Copy curl"}
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                selectedCategory === null
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-white/10 text-white/60 hover:border-white/30"
              }`}
            >
              All ({apiEndpoints.length})
            </button>
            {categories.map((cat) => {
              const count = apiEndpoints.filter(
                (ep) => ep.category === cat,
              ).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Endpoints List */}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {filteredEndpoints.length === 0 ? (
              <p className="text-center text-white/40 py-8 text-sm">
                No endpoints found
              </p>
            ) : (
              filteredEndpoints.map((endpoint, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded border border-white/5 hover:border-primary/30 transition-colors"
                >
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 ${
                      endpoint.method === "GET"
                        ? "bg-green-500/20 text-green-400"
                        : endpoint.method === "POST"
                          ? "bg-blue-500/20 text-blue-400"
                          : endpoint.method === "PUT"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : endpoint.method === "DELETE"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-slate-500/20 text-slate-400"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-primary block truncate">
                      {endpoint.path}
                    </code>
                    <p className="text-xs text-white/40 mt-0.5">
                      {endpoint.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-xs text-white/30">
              Base:{" "}
              <span className="font-mono">{window.location.origin}/api/v1</span>
            </p>
            <a
              href="/ars-llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View Full Docs →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
