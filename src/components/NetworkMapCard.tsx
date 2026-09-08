"use client";

import React, { useState } from "react";
import {
  Network,
  Search,
  Server,
  Radio,
  AlertCircle,
  GitBranch,
  List,
} from "lucide-react";
import NetworkTreeVisualizer from "./NetworkTreeVisualizer";
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

interface NetworkMapCardProps {
  targetIp: string;
}

/**
 * =====================================================================
 * COMPONENT: NetworkMapCard (Box 2)
 * =====================================================================
 * Maps out the network of the IP in the central box.
 * Displays the network as a hierarchical Tree:
 *   Default Gateway (Root)
 *     └── Subnet Domain
 *           ├── Target Host (with Open & Closed Ports as leaves)
 *           └── Discovered Neighbor Peers
 * =====================================================================
 */
export default function NetworkMapCard({ targetIp }: NetworkMapCardProps) {
  // State for Network Subnet Mapping
  const [mapData, setMapData] = useState<NetworkMapData | null>(null);
  const [loadingMap, setLoadingMap] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // State for Target IP Port Scanning (Open / Closed ports)
  const [portData, setPortData] = useState<PortScanData | null>(null);
  const [loadingPorts, setLoadingPorts] = useState<boolean>(false);
  const [portError, setPortError] = useState<string | null>(null);

  /**
   * Scan Subnet Topology (Calls /api/map-network)
   */
  const handleMapNetwork = async () => {
    if (!targetIp.trim()) {
      setMapError("Please enter an IP address in the central input box first.");
      return;
    }

    setLoadingMap(true);
    setMapError(null);

    try {
      const response = await fetch(`/api/map-network?ip=${encodeURIComponent(targetIp.trim())}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to map network for the given IP.");
      }

      setMapData(result.data);

      // Automatically trigger a port scan on the target IP for a seamless tree experience
      handleScanPorts();
    } catch (err: any) {
      setMapError(err.message || "Failed to scan network.");
    } finally {
      setLoadingMap(false);
    }
  };

  /**
   * Scan TCP Ports for Target IP (Calls /api/scan-ports)
   */
  const handleScanPorts = async () => {
    if (!targetIp.trim()) {
      setPortError("Please enter an IP address in the central input box first.");
      return;
    }

    setLoadingPorts(true);
    setPortError(null);

    try {
      const response = await fetch(`/api/scan-ports?ip=${encodeURIComponent(targetIp.trim())}`);
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
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all hover:border-slate-700">
      {/* --- Card Header --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Box 2: Network &amp; Port Tree Mapper</h2>
            <p className="text-xs text-slate-400">Maps subnet, gateway, neighbors, and open/closed ports in a tree</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMapNetwork}
            disabled={loadingMap || !targetIp.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            <Search className={`w-4 h-4 ${loadingMap ? "animate-spin" : ""}`} />
            {loadingMap ? "Mapping Tree..." : "Map Network Tree"}
          </button>
        </div>
      </div>

      {/* --- Card Body --- */}
      <div className="flex-1 mt-5 flex flex-col justify-center">
        {/* Initial Empty State before user scans */}
        {!mapData && !loadingMap && !mapError && (
          <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 my-auto">
            <GitBranch className="w-10 h-10 text-indigo-400/80 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">Ready to Map Network Tree</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {targetIp.trim()
                ? `Ready to generate the network tree for ${targetIp}. Click "Map Network Tree".`
                : "Enter an IP address in the central box above, then click 'Map Network Tree'."}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Visualizes: Default Gateway → Subnet Hub → Target Host (Open/Closed Ports) + Neighbors
            </p>
          </div>
        )}

        {/* Error State */}
        {mapError && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-200">Scan Failed:</p>
              <p className="text-xs mt-1 text-red-300">{mapError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingMap && (
          <div className="text-center py-16 px-4 my-auto">
            <GitBranch className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-white">Building Network Tree &amp; Scanning Ports...</p>
            <p className="text-xs text-slate-400 mt-1">
              Pinging gateway, parsing ARP table, and checking common TCP ports for {targetIp}
            </p>
          </div>
        )}

        {/* Active Network Tree Display */}
        {mapData && !loadingMap && (
          <NetworkTreeVisualizer
            targetIp={mapData.targetIp}
            subnet={mapData.subnet}
            nodes={mapData.nodes}
            ports={portData ? portData.ports : null}
            loadingPorts={loadingPorts}
            onScanPorts={handleScanPorts}
          />
        )}
      </div>
    </div>
  );
}
