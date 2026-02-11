import { useState } from "react";
import { Copy, Check, FileText, Zap, Activity } from "lucide-react";

interface CurlCommand {
  name: string;
  file: string;
  icon: React.ReactNode;
  color: string;
}

const curlCommands: CurlCommand[] = [
  {
    name: "LLMS Context",
    file: "ars-llms.txt",
    icon: <FileText className="w-4 h-4" />,
    color: "#1152d4",
  },
  {
    name: "Skill Definition",
    file: "SKILL.md",
    icon: <Zap className="w-4 h-4" />,
    color: "#22c55e",
  },
  {
    name: "Heartbeat Status",
    file: "HEARTBEAT.md",
    icon: <Activity className="w-4 h-4" />,
    color: "#f59e0b",
  },
];

export const CurlCommandsPanel = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}`;
    }
    return "http://localhost:5173";
  };

  return (
    <div className="font-mono">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {curlCommands.map((cmd, index) => (
          <button
            key={cmd.file}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 text-xs flex items-center gap-2 transition-all border-r border-white/10 ${
              activeTab === index
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
            style={{
              borderBottom:
                activeTab === index ? `2px solid ${cmd.color}` : "none",
              marginBottom: activeTab === index ? "-1px" : "0",
            }}
          >
            <span style={{ color: cmd.color }}>{cmd.icon}</span>
            {cmd.name}
          </button>
        ))}
      </div>

      {/* Code Block */}
      <div className="relative group">
        <div className="bg-black/50 border border-white/10 p-4 overflow-x-auto">
          {/* Line numbers and code */}
          <div className="flex">
            <div className="text-white/20 text-xs pr-4 border-r border-white/10 select-none text-right">
              <div>1</div>
              <div>2</div>
            </div>
            <div className="pl-4 text-sm">
              <div className="text-white/50">
                # Download {curlCommands[activeTab].name}
              </div>
              <div>
                <span className="text-purple-400">curl</span>
                <span className="text-yellow-400"> -O </span>
                <span className="text-green-400">
                  {getBaseUrl()}/{curlCommands[activeTab].file}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={() =>
            handleCopy(
              `curl -O ${getBaseUrl()}/${curlCommands[activeTab].file}`,
              activeTab,
            )
          }
          className="absolute top-2 right-2 p-2 text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          title="Copy command"
        >
          {copiedIndex === activeTab ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 mt-2">
        {curlCommands.map((cmd) => (
          <a
            key={cmd.file}
            href={`/${cmd.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all flex items-center gap-1"
          >
            <span style={{ color: cmd.color }}>{cmd.icon}</span>
            {cmd.file}
          </a>
        ))}
      </div>
    </div>
  );
};
