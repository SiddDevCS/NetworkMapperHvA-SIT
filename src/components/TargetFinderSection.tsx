"use client";

import React, { useState } from "react";
import {
  Globe,
  Laptop,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface LocalIpData {
  interface: string;
  ipv4: string | null;
  ipv6: string | null;
  netmask: string | null;
  cidr: string | null;
  mac: string | null;
  platform?: string;
  timestamp: string;
}

interface TargetFinderSectionProps {
  targetIp: string;
  setTargetIp: (ip: string) => void;
  onStartScan: () => void;
  loading: boolean;
}

/**
 * =====================================================================
 * COMPONENT: TargetFinderSection (THE UP SECTION)
 * =====================================================================
 * Step 1 in the story:
 * Allows the user to either:
 *   1. Manually type in a target IP address (Option A)
 *   2. Or automatically detect their local device/MacBook IP (Option B)
 * =====================================================================
 */
export default function TargetFinderSection({
  targetIp,
  setTargetIp,
  onStartScan,
  loading,
}: TargetFinderSectionProps) {
  // Local device interface discovery state
  const [localData, setLocalData] = useState<LocalIpData | null>(null);
  const [fetchingLocal, setFetchingLocal] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Validate IPv4 format (e.g. 192.168.1.1)
  const isValidIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(targetIp.trim());

  /**
   * Fetches local device IP from /api/local-ip
   */
  const handleFetchLocalIp = async () => {
    setFetchingLocal(true);
    setLocalError(null);

    try {
      const response = await fetch("/api/local-ip");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch local IP.");
      }

      setLocalData(result);
      // Auto-populate the target IP if it's currently empty
      if (!targetIp && result.ipv4) {
        setTargetIp(result.ipv4);
      }
    } catch (err: any) {
      setLocalError(err.message || "Could not detect local IP.");
    } finally {
      setFetchingLocal(false);
    }
  };

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all hover:border-slate-700">
      {/* --- Step Indicator Badge & Title --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Step 1: Target Selection
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Enter Target IP or Find It
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Type any IP address manually, or auto-detect your computer&apos;s active local IP.
          </p>
        </div>

        {targetIp && isValidIpv4 && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Target Selected: {targetIp}</span>
          </div>
        )}
      </div>

      {/* --- 2-Column Grid: Option A (Enter) vs Option B (Find) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 items-stretch">
        
        {/* =============================================================
            OPTION A: MANUALLY ENTER TARGET IP
            ============================================================= */}
        <div className="flex flex-col justify-between p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Option A: Enter an IP</h3>
            </div>

            {/* Input Field */}
            <div className="relative flex items-center mt-2">
              <input
                id="target-ip-input"
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                placeholder="e.g. 192.168.1.1 or 145.28.239.206"
                className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-base rounded-xl px-4 py-3.5 pr-20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 placeholder-slate-600 transition-all"
              />

              {/* Quick Actions inside input */}
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {targetIp && (
                  <button
                    onClick={() => setTargetIp("")}
                    title="Clear input"
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {!targetIp && (
                  <button
                    onClick={() => setTargetIp("127.0.0.1")}
                    className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Localhost
                  </button>
                )}
              </div>
            </div>

            {/* Validation Hint */}
            <div className="mt-2 text-xs">
              {targetIp ? (
                isValidIpv4 ? (
                  <span className="text-emerald-400 font-medium">✓ Valid IPv4 format</span>
                ) : (
                  <span className="text-amber-400 font-medium">⚠ Please enter standard format (e.g. 192.168.1.1)</span>
                )
              ) : (
                <span className="text-slate-500">Enter an IP above or find it using Option B &rarr;</span>
              )}
            </div>
          </div>

          {/* Primary Action Button to Launch Scan */}
          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={onStartScan}
              disabled={loading || !targetIp.trim()}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-[0.99]"
            >
              <Search className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Exploring Network Tree..." : "Map Network Tree & Ports ↓"}
            </button>
          </div>
        </div>

        {/* =============================================================
            OPTION B: FIND YOUR LOCAL DEVICE IP
            ============================================================= */}
        <div className="flex flex-col justify-between p-5 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Option B: Find My Device IP</h3>
                  <p className="text-[11px] text-slate-400">Inspects active adapter (en0 / Wi-Fi / Ethernet)</p>
                </div>
              </div>

              {/* Detect Button */}
              <button
                onClick={handleFetchLocalIp}
                disabled={fetchingLocal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 rounded-lg shadow-sm transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingLocal ? "animate-spin text-emerald-400" : ""}`} />
                {fetchingLocal ? "Finding..." : localData ? "Re-detect" : "Find My IP"}
              </button>
            </div>

            {/* Error Message */}
            {localError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-start gap-2 mt-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{localError}</span>
              </div>
            )}

            {/* Empty State before discovery */}
            {!localData && !fetchingLocal && !localError && (
              <div className="py-6 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-900/30 mt-2">
                <p className="text-xs text-slate-400">Click &quot;Find My IP&quot; to auto-detect your local address.</p>
              </div>
            )}

            {/* Detected Local IP Details */}
            {localData && (
              <div className="space-y-2 mt-2">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Detected ({localData.interface})
                    </span>
                    <p className="font-mono text-lg font-bold text-emerald-400">
                      {localData.ipv4 || "No IPv4"}
                    </p>
                  </div>

                  {localData.ipv4 && (
                    <button
                      onClick={() => setTargetIp(localData.ipv4!)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
                    >
                      Use as Target
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-900/50 border border-slate-800/60 rounded-lg">
                    <span className="text-slate-500 block text-[10px]">Netmask / CIDR</span>
                    <span className="text-slate-300 truncate block">{localData.cidr || localData.netmask || "N/A"}</span>
                  </div>
                  <div className="p-2 bg-slate-900/50 border border-slate-800/60 rounded-lg">
                    <span className="text-slate-500 block text-[10px]">MAC Address</span>
                    <span className="text-slate-300 truncate block">{localData.mac || "N/A"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Ready for mapping
            </span>
            <span>Cross-platform active</span>
          </div>
        </div>

      </div>
    </section>
  );
}
