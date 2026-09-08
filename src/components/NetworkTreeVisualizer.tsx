"use client";

import React, { useState } from "react";
import {
  Router,
  Monitor,
  Laptop,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Unlock,
  Lock,
  ChevronDown,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  Network,
  Server,
  Filter,
  ArrowDown,
  Info,
} from "lucide-react";
import { PortItem, NetworkNode, SubnetInfo } from "@/types/network";

interface NetworkTreeVisualizerProps {
  targetIp: string;
  subnet: SubnetInfo;
  nodes: NetworkNode[];
  ports: PortItem[] | null;
  loadingPorts: boolean;
  onScanPorts: () => void;
}

/**
 * =====================================================================
 * COMPONENT: NetworkTreeVisualizer (THE BOTTOM SECTION)
 * =====================================================================
 * Tells the second chapter of the story:
 * Displays a full-width, hierarchical tree overview showing:
 *   1. Root Gateway & Subnet Hub
 *   2. The MAIN IP (Hero Node with full specs & reverse DNS)
 *   3. All Ports & Subdetails (Open vs Closed leaves branching from Main IP)
 *   4. Discovered Neighbor Devices on the local subnet
 * =====================================================================
 */
export default function NetworkTreeVisualizer({
  targetIp,
  subnet,
  nodes,
  ports,
  loadingPorts,
  onScanPorts,
}: NetworkTreeVisualizerProps) {
  // State for toggles and port filter
  const [expandPorts, setExpandPorts] = useState<boolean>(true);
  const [expandPeers, setExpandPeers] = useState<boolean>(true);
  const [portFilter, setPortFilter] = useState<"all" | "open" | "closed">("all");

  // Identify Gateway node
  const gatewayNode = nodes.find((n) => n.role === "gateway") || {
    ip: subnet.estimatedGateway,
    role: "gateway" as const,
    status: "offline" as const,
    latencyMs: null,
    mac: null,
    hostname: null,
    isTarget: false,
  };

  // Identify the MAIN Target IP node
  const targetNode = nodes.find((n) => n.isTarget) || {
    ip: targetIp,
    role: "target" as const,
    status: "online" as const,
    latencyMs: null,
    mac: null,
    hostname: null,
    isTarget: true,
  };

  // Identify neighboring peer devices
  const peerNodes = nodes.filter((n) => !n.isTarget && n.role !== "gateway");

  // Summary counts for ports
  const openPortsCount = ports ? ports.filter((p) => p.status === "open").length : 0;
  const closedPortsCount = ports ? ports.filter((p) => p.status === "closed").length : 0;

  // Filter ports based on active tab
  const filteredPorts = ports
    ? ports.filter((p) => {
        if (portFilter === "open") return p.status === "open";
        if (portFilter === "closed") return p.status === "closed";
        return true;
      })
    : [];

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      {/* --- Section Header & Title --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <GitBranch className="w-3.5 h-3.5" /> Step 2: Network Tree Overview
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Network Topology &amp; Main IP Tree
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Hierarchical map showing your main IP, its open/closed ports, and subnet peers.
          </p>
        </div>

        {/* Action button to re-scan ports */}
        <div className="flex items-center gap-2">
          <button
            onClick={onScanPorts}
            disabled={loadingPorts}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${loadingPorts ? "animate-spin" : ""}`} />
            {loadingPorts ? "Scanning Ports..." : ports ? "Re-scan Ports" : "Scan Ports"}
          </button>
        </div>
      </div>

      {/* --- THE TREE MAP CANVAS --- */}
      <div className="mt-8 flex flex-col items-center max-w-5xl mx-auto">
        
        {/* ===================================================================
            TREE LEVEL 1: NETWORK ROOT (GATEWAY & SUBNET DOMAIN)
            =================================================================== */}
        <div className="flex flex-col items-center">
          {/* Gateway Card */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/30 border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl shadow-xl shadow-amber-950/20 transition-all">
            <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Network Gateway (Root)
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    gatewayNode.status === "online" ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
              </div>
              <p className="font-mono text-base font-bold text-white tracking-tight">
                {gatewayNode.ip}
              </p>
              {gatewayNode.hostname && (
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[240px]">
                  {gatewayNode.hostname}
                </p>
              )}
            </div>
          </div>

          {/* Vertical Stem */}
          <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/50 to-indigo-500/60" />

          {/* Subnet Pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-950/50 border border-indigo-500/40 rounded-full text-xs font-mono text-indigo-300 shadow-md">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Subnet: {subnet.cidr}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">{nodes.length} hosts detected</span>
          </div>

          {/* Vertical Stem down to Main IP */}
          <div className="w-0.5 h-8 bg-gradient-to-b from-indigo-500/60 to-blue-500" />
        </div>

        {/* ===================================================================
            TREE LEVEL 2: THE MAIN IP (HERO TARGET NODE)
            =================================================================== */}
        <div className="w-full max-w-xl relative">
          <div className="bg-gradient-to-br from-blue-950/60 via-slate-950 to-indigo-950/50 border-2 border-blue-500 rounded-3xl p-6 shadow-2xl shadow-blue-950/40 relative">
            {/* Top Hero Pill */}
            <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Main Target IP
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-500/30">
                  <Laptop className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {targetNode.ip}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {targetNode.hostname || "No reverse DNS record"}
                  </p>
                </div>
              </div>

              <div className="text-right sm:self-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Online
                </div>
                {targetNode.latencyMs !== null && (
                  <div className="text-xs text-slate-400 font-mono flex items-center justify-end gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {targetNode.latencyMs} ms
                  </div>
                )}
              </div>
            </div>

            {/* Subdetails Grid for the Main IP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">MAC Address</span>
                <span className="text-slate-300 truncate block mt-0.5">{targetNode.mac || "N/A"}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 block">Subnet Role</span>
                <span className="text-blue-300 font-semibold block mt-0.5">Target Host</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block">Ports Discovered</span>
                <span className="text-emerald-400 font-bold block mt-0.5">
                  {ports ? `${openPortsCount} Open / ${ports.length} Tested` : "Click Scan Ports"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BRANCHING CONNECTOR STEMS (MAIN IP BRANCHES) --- */}
        <div className="w-full flex justify-center mt-2">
          <svg className="w-96 h-10 text-slate-700" viewBox="0 0 384 40" fill="none">
            {/* Trunk down from Main IP */}
            <path d="M192 0 V20" stroke="currentColor" strokeWidth="2" />
            {/* Branch left to Ports */}
            <path d="M192 20 H96 V40" stroke="currentColor" strokeWidth="2" />
            {/* Branch right to Neighbor Devices */}
            <path d="M192 20 H288 V40" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* ===================================================================
            TREE LEVEL 3: TWO SUB-BRANCHES (PORTS & NEIGHBORS)
            =================================================================== */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 items-start">

          {/* -----------------------------------------------------------------
              SUB-BRANCH 1: THE PORTS TREE & ALL PORT SUBDETAILS
              ----------------------------------------------------------------- */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            {/* Branch Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Main IP Ports &amp; Services</h3>
                {ports && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                    {openPortsCount} open
                  </span>
                )}
              </div>

              {/* Filter Pills */}
              {ports && (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setPortFilter("all")}
                    className={`px-2 py-0.5 rounded ${
                      portFilter === "all" ? "bg-blue-600/30 text-blue-300 font-semibold" : "text-slate-400"
                    }`}
                  >
                    All ({ports.length})
                  </button>
                  <button
                    onClick={() => setPortFilter("open")}
                    className={`px-2 py-0.5 rounded ${
                      portFilter === "open"
                        ? "bg-emerald-600/30 text-emerald-300 font-semibold"
                        : "text-slate-400 hover:text-emerald-400"
                    }`}
                  >
                    Open ({openPortsCount})
                  </button>
                  <button
                    onClick={() => setPortFilter("closed")}
                    className={`px-2 py-0.5 rounded ${
                      portFilter === "closed"
                        ? "bg-slate-700 text-slate-200 font-semibold"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    Closed ({closedPortsCount})
                  </button>
                </div>
              )}
            </div>

            {/* Ports Body */}
            <div className="mt-4">
              {/* Not scanned yet */}
              {!ports && !loadingPorts && (
                <div className="text-center py-8 px-4 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/30">
                  <Radio className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Ports not scanned yet for {targetIp}.</p>
                  <button
                    onClick={onScanPorts}
                    className="mt-2 text-emerald-400 hover:text-emerald-300 underline font-medium text-xs"
                  >
                    Click to probe TCP ports now
                  </button>
                </div>
              )}

              {/* Loading Ports */}
              {loadingPorts && (
                <div className="text-center py-10">
                  <Radio className="w-8 h-8 text-emerald-400 animate-pulse mx-auto mb-3" />
                  <p className="text-xs text-slate-300 font-medium">Probing TCP ports via socket handshakes...</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Testing {targetIp}</p>
                </div>
              )}

              {/* Ports Leaf Nodes */}
              {ports && !loadingPorts && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredPorts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No ports match the selected filter.
                    </div>
                  ) : (
                    filteredPorts.map((p) => {
                      const isOpen = p.status === "open";
                      return (
                        <div
                          key={p.port}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                            isOpen
                              ? "bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-950/30"
                              : "bg-slate-900/40 border-slate-800/80 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg border ${
                                isOpen
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-slate-800/80 text-slate-500 border-slate-700/60"
                              }`}
                            >
                              {isOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-white">
                                  :{p.port}
                                </span>
                                <span className="text-xs font-semibold text-slate-200">
                                  {p.service}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {p.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                isOpen
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOpen ? "bg-emerald-400" : "bg-slate-500"
                                }`}
                              />
                              {isOpen ? "OPEN" : "CLOSED"}
                            </span>
                            {isOpen && p.latencyMs !== null && (
                              <div className="text-[10px] text-emerald-400/90 font-mono mt-0.5">
                                {p.latencyMs} ms
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* -----------------------------------------------------------------
              SUB-BRANCH 2: SUBNET NEIGHBORS & PEERS
              ----------------------------------------------------------------- */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            {/* Branch Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Subnet Neighbor Devices</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-mono text-[10px]">
                  {peerNodes.length} peers
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">ARP Discovery</span>
            </div>

            {/* Peers List */}
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
              {peerNodes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No other active neighbor devices found in the local ARP cache.
                </div>
              ) : (
                peerNodes.map((peer) => {
                  const isOnline = peer.status === "online";
                  return (
                    <div
                      key={peer.ip}
                      className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/90 text-slate-400 border border-slate-700">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-white">
                            {peer.ip}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {peer.mac ? `MAC: ${peer.mac}` : "Broadcast/Peer"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            isOnline ? "text-emerald-400" : "text-slate-500"
                          }`}
                        >
                          {isOnline ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Online
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-500" /> Offline
                            </>
                          )}
                        </span>
                        {peer.latencyMs !== null && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {peer.latencyMs} ms
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
