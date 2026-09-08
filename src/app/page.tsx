"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ArrowDown,
  GitBranch,
  Terminal,
  Activity,
  AlertCircle,
} from "lucide-react";
import TargetFinderSection from "@/components/TargetFinderSection";
import NetworkTreeVisualizer from "@/components/NetworkTreeVisualizer";
import InteractiveNetworkGraph from "@/components/InteractiveNetworkGraph";
import { NetworkNode, PortItem, SubnetInfo, PortScanSummary } from "@/types/network";

interface PortScanData {
  targetIp: string;
  ports: PortItem[];
  summary: PortScanSummary;
  timestamp: string;
}

interface NetworkMapData {
  targetIp: string;
  subnet: SubnetInfo;
  nodes: NetworkNode[];
  arpEntriesFound: number;
  scanDurationMs: number;
  timestamp: string;
}

/**
 * =====================================================================
 * MAIN DASHBOARD PAGE (src/app/page.tsx)
 * =====================================================================
 * Tells the complete story from top to bottom:
 * 
 * 1. UP SECTION:
 *    - Enter your target IP (Option A)
 *    - Or find your local device IP via en0 / Wi-Fi / Ethernet (Option B)
 * 
 * 2. STORY CONNECTOR:
 *    - Downward flow leading into the tree map
 * 
 * 3. BOTTOM SECTION:
 *    - Full-width Tree Overview:
 *      - Network Gateway (Root)
 *      - Subnet Domain
 *      - The MAIN IP (Hero card with latency, hostname, MAC)
 *      - All Open / Closed Ports & Services
 *      - Discovered Neighbor Devices
 * =====================================================================
 */

export default function HomePage() {
  // State for the Target IP selected in the UP section
  const [targetIp, setTargetIp] = useState<string>("");

  // State for Layout Mode: 'graph' (Interactive Draggable Dots) or 'tree' (Hierarchical Tree)
  const [viewMode, setViewMode] = useState<"graph" | "tree">("graph");

  // State for Network Subnet Mapping
  const [mapData, setMapData] = useState<NetworkMapData | null>(null);
  const [loadingMap, setLoadingMap] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // State for Target IP Port Scanning (Open / Closed ports)
  const [portData, setPortData] = useState<PortScanData | null>(null);
  const [loadingPorts, setLoadingPorts] = useState<boolean>(false);
  const [portError, setPortError] = useState<string | null>(null);

  /**
   * Triggers the full network tree scan from the UP section
   */
  const handleStartScan = async () => {
    if (!targetIp.trim()) return;

    setLoadingMap(true);
    setMapError(null);

    try {
      // 1. Fetch Subnet Topology & Neighbors
      const response = await fetch(`/api/map-network?ip=${encodeURIComponent(targetIp.trim())}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to map network for the target IP.");
      }

      setMapData(result.data);

      // 2. Automatically scan common ports for the target IP
      handleScanPorts(targetIp.trim());
    } catch (err: any) {
      setMapError(err.message || "Network scan failed.");
    } finally {
      setLoadingMap(false);
    }
  };

  /**
   * Scans TCP ports for the target IP
   */
  const handleScanPorts = async (ipToScan?: string) => {
    const ip = ipToScan || targetIp.trim();
    if (!ip) return;

    setLoadingPorts(true);
    setPortError(null);

    try {
      const response = await fetch(`/api/scan-ports?ip=${encodeURIComponent(ip)}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to scan ports.");
      }

      setPortData(result.data);
    } catch (err: any) {
      setPortError(err.message || "Port scan failed.");
    } finally {
      setLoadingPorts(false);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col justify-between">
      <div>
        {/* --- Top Header & Story Title --- */}
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Network Inspector
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Gemaakt door mij (en AI).
          </p>
        </header>

        {/* =============================================================
            1. THE UP SECTION: ENTER TARGET IP OR FIND IT
            ============================================================= */}
        <TargetFinderSection
          targetIp={targetIp}
          setTargetIp={setTargetIp}
          onStartScan={handleStartScan}
          loading={loadingMap}
        />

        {/* =============================================================
            VISUAL STORY CONNECTOR (UP TO DOWN FLOW)
            ============================================================= */}
        <div className="flex flex-col items-center my-8">
          <div className="h-10 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500" />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono shadow-md my-1">
            <ArrowDown className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
            <span>Story Continues: Tree Overview Below</span>
          </div>
          <div className="h-10 w-0.5 bg-gradient-to-b from-purple-500 via-indigo-500 to-slate-800" />
        </div>

        {/* =============================================================
            2. THE BOTTOM SECTION: MAP OVERVIEW TREE & SUBDETAILS
            ============================================================= */}
        <section>
          {/* State 1: Scan Error */}
          {mapError && (
            <div className="p-5 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-300 text-sm flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-200">Unable to generate network tree:</p>
                <p className="text-xs mt-1 text-red-300">{mapError}</p>
              </div>
            </div>
          )}

          {/* State 2: Initial Empty State before user triggers scan */}
          {!mapData && !loadingMap && (
            <div className="text-center py-16 px-6 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 shadow-xl">
              <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 w-fit mx-auto mb-4">
                <GitBranch className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Step 2: Network Tree Overview</h3>
              <p className="text-sm text-slate-400 mt-1.5 max-w-md mx-auto">
                {targetIp.trim()
                  ? `Target selected (${targetIp}). Click "Map Network Tree & Ports" above to reveal the full tree.`
                  : "Enter a target IP or detect your device IP in the section above to map out the network tree."}
              </p>
            </div>
          )}

          {/* State 3: Loading Tree Scan */}
          {loadingMap && (
            <div className="text-center py-20 px-6 border border-slate-800 rounded-3xl bg-slate-900/60 shadow-xl">
              <Activity className="w-10 h-10 text-indigo-400 animate-pulse mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">Building Network Tree Overview...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Pinging gateway, discovering ARP neighbors, and inspecting open/closed TCP ports for {targetIp}
              </p>
            </div>
          )}

          {/* State 4: Active Network Overview (Interactive Graph vs Tree View) */}
          {mapData && !loadingMap && (
            <div className="space-y-4">
              {/* View Switcher Header */}
              <div className="flex items-center justify-end gap-2 px-1">
                <span className="text-xs text-slate-400 font-medium">Layout Mode:</span>
                <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <button
                    onClick={() => setViewMode("graph")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      viewMode === "graph"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Interactive Dots (Free-Touch)</span>
                  </button>

                  <button
                    onClick={() => setViewMode("tree")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                      viewMode === "tree"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Hierarchical Tree</span>
                  </button>
                </div>
              </div>

              {/* View Render */}
              {viewMode === "graph" ? (
                <InteractiveNetworkGraph
                  targetIp={mapData.targetIp}
                  subnet={mapData.subnet}
                  nodes={mapData.nodes}
                  ports={portData ? portData.ports : null}
                  loadingPorts={loadingPorts}
                  onScanPorts={() => handleScanPorts()}
                />
              ) : (
                <NetworkTreeVisualizer
                  targetIp={mapData.targetIp}
                  subnet={mapData.subnet}
                  nodes={mapData.nodes}
                  ports={portData ? portData.ports : null}
                  loadingPorts={loadingPorts}
                  onScanPorts={() => handleScanPorts()}
                />
              )}
            </div>
          )}
        </section>
      </div>

      {/* --- Developer Guide Footer --- */}
      <footer className="mt-16 pt-6 border-t border-slate-900 text-xs text-slate-500">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-300 mb-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Developer Guide — Story Components Architecture:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] text-slate-400">
            <div>
              <span className="text-blue-400">src/components/TargetFinderSection.tsx</span>: The Up Section (Enter/Find IP)
            </div>
            <div>
              <span className="text-indigo-400">src/components/NetworkTreeVisualizer.tsx</span>: The Bottom Section (Tree Overview)
            </div>
            <div>
              <span className="text-emerald-400">src/app/api/local-ip/route.ts</span>: Auto-detects local network adapter
            </div>
            <div>
              <span className="text-emerald-400">src/app/api/scan-ports/route.ts</span>: Probes Open / Closed TCP ports
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
