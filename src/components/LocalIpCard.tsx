"use client";

import React, { useState } from "react";
import { Laptop, Wifi, RefreshCw, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

/**
 * TypeScript interface representing the response from /api/local-ip
 */
interface LocalIpData {
  interface: string;
  ipv4: string | null;
  ipv6: string | null;
  netmask: string | null;
  cidr: string | null;
  mac: string | null;
  isInternal: boolean;
  timestamp: string;
  allInterfaces?: string[];
}

interface LocalIpCardProps {
  // Callback to set the central IP input box when user clicks "Use as Target IP"
  onSelectIp: (ip: string) => void;
}

/**
 * =====================================================================
 * COMPONENT: LocalIpCard (Box 1)
 * =====================================================================
 * Displays and fetches the MacBook's local "en0" network interface details.
 * Contains clear comments for beginner and intermediate React developers.
 * =====================================================================
 */
export default function LocalIpCard({ onSelectIp }: LocalIpCardProps) {
  // --- React State Hooks ---
  // `data`: Stores the interface information returned by the API
  const [data, setData] = useState<LocalIpData | null>(null);
  // `loading`: Tracks whether the network request is currently in progress
  const [loading, setLoading] = useState<boolean>(false);
  // `error`: Holds any error message if the fetch fails
  const [error, setError] = useState<string | null>(null);

  /**
   * Function to call our Next.js API route (/api/local-ip)
   */
  const handleFetchLocalIp = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch data from the Next.js API route located at src/app/api/local-ip/route.ts
      const response = await fetch("/api/local-ip");
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch local en0 IP");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching local IP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all hover:border-slate-700">
      {/* --- Card Header --- */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Box 1: Local Device IP</h2>
            <p className="text-xs text-slate-400">Inspects active adapter (&quot;en0&quot;, &quot;Wi-Fi&quot;, &quot;Ethernet&quot;)</p>
          </div>
        </div>

        {/* Fetch Button */}
        <button
          onClick={handleFetchLocalIp}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Fetching..." : "Fetch Local IP"}
        </button>
      </div>

      {/* --- Card Body --- */}
      <div className="flex-1 mt-5 flex flex-col justify-center">
        {/* State 1: Initial state before user clicks the fetch button */}
        {!data && !loading && !error && (
          <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Wifi className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Click &ldquo;Fetch en0 IP&rdquo; above to read local network info.</p>
            <p className="text-xs text-slate-500 mt-1">
              Reads Node.js <code className="text-blue-400">os.networkInterfaces()[&apos;en0&apos;]</code>
            </p>
          </div>
        )}

        {/* State 2: Error notification */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-200">Unable to retrieve interface:</p>
              <p className="text-xs mt-1 text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* State 3: Data successfully retrieved */}
        {data && (
          <div className="space-y-4">
            {/* Primary IPv4 Highlight Box */}
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  IPv4 Address ({data.interface})
                </span>
                <p className="text-2xl font-mono font-bold text-blue-400 mt-0.5">
                  {data.ipv4 || "No IPv4 assigned"}
                </p>
              </div>

              {/* Shortcut: Use this IP in the center box */}
              {data.ipv4 && (
                <button
                  onClick={() => onSelectIp(data.ipv4!)}
                  title="Copy this IP to the central input box"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg transition-colors"
                >
                  Use as Target
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Detailed Properties Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block">Subnet Mask / CIDR</span>
                <span className="font-mono text-slate-200 mt-0.5 block truncate">
                  {data.cidr || data.netmask || "N/A"}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <span className="text-slate-500 block">Hardware (MAC)</span>
                <span className="font-mono text-slate-200 mt-0.5 block truncate">
                  {data.mac || "N/A"}
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg col-span-2">
                <span className="text-slate-500 block">IPv6 Address</span>
                <span className="font-mono text-slate-300 mt-0.5 block truncate">
                  {data.ipv6 || "None"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Interface active
              </span>
              <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
