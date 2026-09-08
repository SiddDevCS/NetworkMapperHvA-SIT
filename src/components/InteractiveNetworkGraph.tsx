"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  Info,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Unlock,
  Lock,
  Router,
  Laptop,
  Radio,
  Monitor,
  Layers,
} from "lucide-react";
import { NetworkNode, PortItem, SubnetInfo } from "@/types/network";

export interface GraphNode {
  id: string;
  label: string;
  sublabel: string;
  type: "gateway" | "target" | "subnet" | "port-open" | "port-closed" | "peer";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  borderColor: string;
  glowColor: string;
  iconType: "gateway" | "target" | "subnet" | "port-open" | "port-closed" | "peer";
  details: {
    ip?: string;
    port?: number;
    service?: string;
    description?: string;
    mac?: string | null;
    hostname?: string | null;
    latencyMs?: number | null;
    status: string;
  };
}

export interface GraphLink {
  source: string;
  target: string;
  color: string;
}

interface InteractiveNetworkGraphProps {
  targetIp: string;
  subnet: SubnetInfo;
  nodes: NetworkNode[];
  ports: PortItem[] | null;
  loadingPorts: boolean;
  onScanPorts: () => void;
}

/**
 * =====================================================================
 * COMPONENT: InteractiveNetworkGraph ("Free-Touch Movy Overview")
 * =====================================================================
 * An interactive, draggable, force-assisted node-link graph:
 * - Each entity (Gateway, Subnet, Main IP, Ports, Neighbors) is a glowing dot.
 * - Connecting lines dynamically stretch and follow when you drag dots.
 * - Full mouse & touch support (drag, drop, throw).
 * - Gentle floating ambient physics makes the graph feel alive!
 * =====================================================================
 */
export default function InteractiveNetworkGraph({
  targetIp,
  subnet,
  nodes,
  ports,
  loadingPorts,
  onScanPorts,
}: InteractiveNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 540,
  });

  // State to track currently dragged node
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  // State for selected node to display in HUD card
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  // Toggle for hover reaction (balls react organically when cursor is nearby)
  const [hoverReaction, setHoverReaction] = useState<boolean>(true);
  // Filter toggle: show/hide closed ports to reduce clutter
  const [showClosedPorts, setShowClosedPorts] = useState<boolean>(true);

  // Mutable ref to hold node instances for the 60fps physics loop
  const graphNodesRef = useRef<GraphNode[]>([]);
  // Trigger state to force re-render when dragging and updating positions
  const [renderCounter, setRenderCounter] = useState(0);

  // Mouse / Touch coordinate tracking for drag and hover proximity
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  // Gateway node from nodes list
  const gatewayNode = nodes.find((n) => n.role === "gateway") || {
    ip: subnet.estimatedGateway,
    role: "gateway" as const,
    status: "offline" as const,
    latencyMs: null,
    mac: null,
    hostname: null,
    isTarget: false,
  };

  // Main Target node
  const targetNode = nodes.find((n) => n.isTarget) || {
    ip: targetIp,
    role: "target" as const,
    status: "online" as const,
    latencyMs: null,
    mac: null,
    hostname: null,
    isTarget: true,
  };

  // Peer nodes
  const peerNodes = nodes.filter((n) => !n.isTarget && n.role !== "gateway");

  /**
   * 1. Initialize Nodes and their initial coordinates
   */
  useEffect(() => {
    const w = dimensions.width;
    const h = dimensions.height;
    const cx = w / 2;
    const cy = h / 2;

    const initialNodes: GraphNode[] = [];

    // --- Node 1: Default Gateway (Root dot) ---
    initialNodes.push({
      id: "gateway",
      label: gatewayNode.ip,
      sublabel: "Gateway",
      type: "gateway",
      x: cx - 180,
      y: cy - 140,
      vx: 0,
      vy: 0,
      radius: 28,
      color: "from-amber-600 to-amber-500",
      borderColor: "border-amber-400",
      glowColor: "rgba(245, 158, 11, 0.4)",
      iconType: "gateway",
      details: {
        ip: gatewayNode.ip,
        hostname: gatewayNode.hostname,
        mac: gatewayNode.mac,
        latencyMs: gatewayNode.latencyMs,
        status: gatewayNode.status,
      },
    });

    // --- Node 2: Subnet Hub ---
    initialNodes.push({
      id: "subnet",
      label: subnet.cidr,
      sublabel: "Subnet Hub",
      type: "subnet",
      x: cx - 50,
      y: cy - 90,
      vx: 0,
      vy: 0,
      radius: 24,
      color: "from-indigo-600 to-indigo-500",
      borderColor: "border-indigo-400",
      glowColor: "rgba(99, 102, 241, 0.4)",
      iconType: "subnet",
      details: {
        ip: subnet.cidr,
        description: `Subnet range: ${subnet.networkAddress} - ${subnet.broadcastAddress}`,
        status: `${nodes.length} hosts detected`,
      },
    });

    // --- Node 3: THE MAIN IP (HERO TARGET NODE) ---
    initialNodes.push({
      id: "target",
      label: targetNode.ip,
      sublabel: "Main Target",
      type: "target",
      x: cx,
      y: cy + 30,
      vx: 0,
      vy: 0,
      radius: 36, // Biggest dot
      color: "from-blue-600 via-indigo-600 to-cyan-500",
      borderColor: "border-cyan-300",
      glowColor: "rgba(6, 182, 212, 0.6)",
      iconType: "target",
      details: {
        ip: targetNode.ip,
        hostname: targetNode.hostname,
        mac: targetNode.mac,
        latencyMs: targetNode.latencyMs,
        status: targetNode.status,
      },
    });

    // --- Node 4: Ports (Cluster around the Main IP) ---
    if (ports && ports.length > 0) {
      const activePorts = showClosedPorts ? ports : ports.filter((p) => p.status === "open");
      const portCount = activePorts.length;
      const portRadius = 140; // Distance from target

      activePorts.forEach((p, idx) => {
        // Position ports in an arc around the target IP
        const angle = (idx / (portCount || 1)) * 2 * Math.PI - Math.PI / 2;
        const isOpen = p.status === "open";

        initialNodes.push({
          id: `port-${p.port}`,
          label: `:${p.port}`,
          sublabel: p.service,
          type: isOpen ? "port-open" : "port-closed",
          x: cx + Math.cos(angle) * portRadius,
          y: cy + 30 + Math.sin(angle) * portRadius,
          vx: 0,
          vy: 0,
          radius: isOpen ? 22 : 16,
          color: isOpen ? "from-emerald-600 to-teal-500" : "from-slate-700 to-slate-800",
          borderColor: isOpen ? "border-emerald-400" : "border-slate-600",
          glowColor: isOpen ? "rgba(16, 185, 129, 0.5)" : "rgba(100, 116, 139, 0.2)",
          iconType: isOpen ? "port-open" : "port-closed",
          details: {
            port: p.port,
            service: p.service,
            description: p.description,
            latencyMs: p.latencyMs,
            status: isOpen ? "Open" : "Closed",
          },
        });
      });
    }

    // --- Node 5: Discovered Subnet Peers ---
    peerNodes.forEach((peer, idx) => {
      const offsetX = 160 + (idx % 3) * 60;
      const offsetY = -80 + Math.floor(idx / 3) * 70;

      initialNodes.push({
        id: `peer-${peer.ip}`,
        label: peer.ip,
        sublabel: "Neighbor",
        type: "peer",
        x: cx + offsetX,
        y: cy + offsetY,
        vx: 0,
        vy: 0,
        radius: 22,
        color: "from-slate-800 to-slate-700",
        borderColor: "border-slate-500",
        glowColor: "rgba(148, 163, 184, 0.3)",
        iconType: "peer",
        details: {
          ip: peer.ip,
          mac: peer.mac,
          latencyMs: peer.latencyMs,
          status: peer.status,
        },
      });
    });

    graphNodesRef.current = initialNodes;
    // Set default selected node to target
    const target = initialNodes.find((n) => n.id === "target");
    if (target) setSelectedNode(target);

    // Trigger initial render
    setRenderCounter((c) => c + 1);
  }, [dimensions, targetIp, subnet, nodes, ports, showClosedPorts]);

  /**
   * 2. Window Resize Observer to adjust canvas dimensions
   */
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: Math.max(520, Math.min(620, window.innerHeight * 0.6)),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  /**
   * 3. Interactive Physics & Motion Loop (No Autonomous Drift!)
   * - Balls stay 100% still by default.
   * - When cursor hovers near or around a dot, it reacts/displaces with gentle spring force.
   * - When dragged, follows pointer smoothly.
   * - When released or cursor leaves, decelerates immediately to a dead stop.
   */
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const nodesList = graphNodesRef.current;
      if (!nodesList || nodesList.length === 0) return;

      const w = dimensions.width;
      const h = dimensions.height;
      let hasMovement = false;

      nodesList.forEach((node) => {
        // Skip node actively dragged by user
        if (node.id === draggedNodeId) return;

        // 1. Organic Hover Proximity Reaction (only when user cursor hovers near)
        if (hoverReaction && mousePosRef.current.active) {
          const dx = node.x - mousePosRef.current.x;
          const dy = node.y - mousePosRef.current.y;
          const dist = Math.hypot(dx, dy);
          const hoverZone = node.radius + 65; // Proximity field

          if (dist < hoverZone && dist > 1) {
            const force = (1 - dist / hoverZone) * 1.5;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
            hasMovement = true;
          }
        }

        // 2. High friction damping: quickly stops movement so balls stay still
        if (node.vx !== 0 || node.vy !== 0) {
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.82;
          node.vy *= 0.82;

          if (Math.abs(node.vx) < 0.02) node.vx = 0;
          if (Math.abs(node.vy) < 0.02) node.vy = 0;

          // Keep within boundaries
          const pad = node.radius + 10;
          node.x = Math.max(pad, Math.min(w - pad, node.x));
          node.y = Math.max(pad, Math.min(h - pad, node.y));
          hasMovement = true;
        }
      });

      if (hasMovement || draggedNodeId) {
        setRenderCounter((c) => c + 1);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, hoverReaction, draggedNodeId]);

  /**
   * 4. Build Links (Edges connecting the dots)
   */
  const links: GraphLink[] = useMemo(() => {
    const list: GraphLink[] = [];
    // Gateway -> Subnet
    list.push({ source: "gateway", target: "subnet", color: "rgba(245, 158, 11, 0.4)" });
    // Subnet -> Target
    list.push({ source: "subnet", target: "target", color: "rgba(99, 102, 241, 0.6)" });

    // Target -> Ports
    graphNodesRef.current.forEach((n) => {
      if (n.type.startsWith("port")) {
        const isOpen = n.type === "port-open";
        list.push({
          source: "target",
          target: n.id,
          color: isOpen ? "rgba(16, 185, 129, 0.5)" : "rgba(100, 116, 139, 0.25)",
        });
      } else if (n.type === "peer") {
        // Subnet -> Peer
        list.push({
          source: "subnet",
          target: n.id,
          color: "rgba(148, 163, 184, 0.3)",
        });
      }
    });

    return list;
  }, [renderCounter, showClosedPorts]);

  /**
   * 5. Drag Handlers (Mouse & Touch)
   */
  const handleStartDrag = (nodeId: string, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const node = graphNodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;

    setDraggedNodeId(nodeId);
    setSelectedNode(node);

    // Save offset between click and node center
    dragOffsetRef.current = {
      x: clientX - rect.left - node.x,
      y: clientY - rect.top - node.y,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!draggedNodeId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const node = graphNodesRef.current.find((n) => n.id === draggedNodeId);
    if (!node) return;

    const newX = clientX - rect.left - dragOffsetRef.current.x;
    const newY = clientY - rect.top - dragOffsetRef.current.y;

    // Constrain inside canvas
    const pad = node.radius + 5;
    node.x = Math.max(pad, Math.min(dimensions.width - pad, newX));
    node.y = Math.max(pad, Math.min(dimensions.height - pad, newY));

    // Zero out velocity while user is dragging
    node.vx = 0;
    node.vy = 0;

    setRenderCounter((c) => c + 1);
  };

  const handleEndDrag = () => {
    if (draggedNodeId) {
      // Zero out velocity on release so the ball stays exactly where it was placed
      const node = graphNodesRef.current.find((n) => n.id === draggedNodeId);
      if (node) {
        node.vx = 0;
        node.vy = 0;
      }
      setDraggedNodeId(null);
    }
  };

  /**
   * Reset all dots to their default stationary positions
   */
  const handleResetPositions = () => {
    const w = dimensions.width;
    const h = dimensions.height;
    const cx = w / 2;
    const cy = h / 2;

    const list = graphNodesRef.current;
    const gateway = list.find((n) => n.id === "gateway");
    if (gateway) {
      gateway.x = cx - 180;
      gateway.y = cy - 140;
      gateway.vx = 0;
      gateway.vy = 0;
    }

    const subnetNode = list.find((n) => n.id === "subnet");
    if (subnetNode) {
      subnetNode.x = cx - 50;
      subnetNode.y = cy - 90;
      subnetNode.vx = 0;
      subnetNode.vy = 0;
    }

    const target = list.find((n) => n.id === "target");
    if (target) {
      target.x = cx;
      target.y = cy + 30;
      target.vx = 0;
      target.vy = 0;
    }

    const portNodes = list.filter((n) => n.type.startsWith("port"));
    const portCount = portNodes.length;
    const portRadius = 140;
    portNodes.forEach((p, idx) => {
      const angle = (idx / (portCount || 1)) * 2 * Math.PI - Math.PI / 2;
      p.x = cx + Math.cos(angle) * portRadius;
      p.y = cy + 30 + Math.sin(angle) * portRadius;
      p.vx = 0;
      p.vy = 0;
    });

    const peers = list.filter((n) => n.type === "peer");
    peers.forEach((peer, idx) => {
      const offsetX = 160 + (idx % 3) * 60;
      const offsetY = -80 + Math.floor(idx / 3) * 70;
      peer.x = cx + offsetX;
      peer.y = cy + offsetY;
      peer.vx = 0;
      peer.vy = 0;
    });

    setRenderCounter((c) => c + 1);
  };

  // Helper map for fast node lookup when drawing links
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphNodesRef.current.forEach((n) => map.set(n.id, n));
    return map;
  }, [renderCounter]);

  return (
    <div className="w-full bg-slate-950/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {/* --- Top Controls & Legend Bar --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-white tracking-wide">Interactive Movy Node Network</span>
          <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
            • Drag dots freely with mouse or touch
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Reset Layout Button */}
          <button
            onClick={handleResetPositions}
            title="Reset dots back to their original balanced positions"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>Reset Layout</span>
          </button>

          {/* Hover Reaction Toggle */}
          <button
            onClick={() => setHoverReaction(!hoverReaction)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              hoverReaction
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            Hover Reaction: {hoverReaction ? "On" : "Off"}
          </button>

          {/* Toggle Closed Ports */}
          {ports && ports.length > 0 && (
            <button
              onClick={() => setShowClosedPorts(!showClosedPorts)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showClosedPorts
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {showClosedPorts ? "Hide Closed" : "Show All Ports"}
            </button>
          )}

          {/* Scan Ports Button */}
          <button
            onClick={onScanPorts}
            disabled={loadingPorts}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${loadingPorts ? "animate-spin" : ""}`} />
            {loadingPorts ? "Scanning..." : "Scan Ports"}
          </button>
        </div>
      </div>

      {/* --- THE INTERACTIVE CANVAS SPACE --- */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ height: `${dimensions.height}px` }}
        onMouseMove={(e) => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            mousePosRef.current = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              active: true,
            };
          }
          handlePointerMove(e.clientX, e.clientY);
        }}
        onMouseUp={handleEndDrag}
        onMouseLeave={() => {
          mousePosRef.current.active = false;
          handleEndDrag();
        }}
        onTouchMove={(e) => {
          if (e.touches[0] && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            mousePosRef.current = {
              x: e.touches[0].clientX - rect.left,
              y: e.touches[0].clientY - rect.top,
              active: true,
            };
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => {
          mousePosRef.current.active = false;
          handleEndDrag();
        }}
      >
        {/* Subtle Cyber Grid Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* SVG LAYER: Connecting Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={dimensions.width}
          height={dimensions.height}
        >
          {links.map((link, idx) => {
            const sourceNode = nodeMap.get(link.source);
            const targetNode = nodeMap.get(link.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <line
                key={`${link.source}-${link.target}-${idx}`}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={link.color}
                strokeWidth={link.source === "target" && link.target.startsWith("port-open") ? 2.5 : 1.5}
                strokeDasharray={link.target.startsWith("port-closed") ? "4 4" : undefined}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* HTML / REACT LAYER: Draggable Glowing Dots */}
        {graphNodesRef.current.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isBeingDragged = draggedNodeId === node.id;

          return (
            <div
              key={node.id}
              style={{
                transform: `translate3d(${node.x - node.radius}px, ${node.y - node.radius}px, 0)`,
                width: `${node.radius * 2}px`,
                height: `${node.radius * 2}px`,
                boxShadow: `0 0 ${node.radius * 1.2}px ${node.glowColor}`,
              }}
              className={`absolute rounded-full bg-gradient-to-br ${node.color} border-2 ${
                node.borderColor
              } flex flex-col items-center justify-center text-center shadow-lg transition-transform ${
                isBeingDragged ? "scale-110 z-30 ring-2 ring-white/60" : "hover:scale-105 z-10"
              } ${isSelected ? "ring-2 ring-cyan-400" : ""}`}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleStartDrag(node.id, e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (e.touches[0]) {
                  handleStartDrag(node.id, e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              onClick={() => setSelectedNode(node)}
            >
              {/* Dot Icon / Text */}
              {node.iconType === "target" ? (
                <Laptop className="w-6 h-6 text-white drop-shadow" />
              ) : node.iconType === "gateway" ? (
                <Router className="w-5 h-5 text-amber-200 drop-shadow" />
              ) : node.iconType === "subnet" ? (
                <Layers className="w-4 h-4 text-indigo-200 drop-shadow" />
              ) : node.iconType === "port-open" ? (
                <Unlock className="w-3.5 h-3.5 text-white" />
              ) : node.iconType === "port-closed" ? (
                <Lock className="w-3 h-3 text-slate-400" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-slate-300" />
              )}

              {/* Dot Label (under dot) */}
              <div
                className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none px-2 py-0.5 rounded-md bg-slate-950/80 border border-slate-800/80 text-[10px] font-mono text-slate-300 shadow"
              >
                {node.label}
              </div>
            </div>
          );
        })}

        {/* Floating Instructions Pill inside Canvas */}
        <div className="absolute top-3 left-3 pointer-events-none px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 backdrop-blur-sm shadow flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click &amp; drag any node • Click a node to view specs</span>
        </div>
      </div>

      {/* --- HUD DETAILS CARD: Displays specs for whatever dot is selected --- */}
      {selectedNode && (
        <div className="mt-4 p-4 bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-xl border ${
                selectedNode.type === "target"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  : selectedNode.type === "gateway"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : selectedNode.type === "port-open"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {selectedNode.iconType === "target" ? (
                <Laptop className="w-5 h-5" />
              ) : selectedNode.iconType === "gateway" ? (
                <Router className="w-5 h-5" />
              ) : selectedNode.iconType === "port-open" ? (
                <Unlock className="w-5 h-5" />
              ) : selectedNode.iconType === "port-closed" ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-mono text-white">
                  {selectedNode.label}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedNode.sublabel}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedNode.details.status === "online" || selectedNode.details.status === "Open"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {selectedNode.details.status}
                </span>
              </div>

              {/* Sub-description or hostname */}
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                {selectedNode.details.hostname && (
                  <span>Host: <span className="text-slate-200 font-mono">{selectedNode.details.hostname}</span></span>
                )}
                {selectedNode.details.description && (
                  <span>{selectedNode.details.description}</span>
                )}
                {selectedNode.details.mac && (
                  <span>MAC: <span className="text-slate-300 font-mono">{selectedNode.details.mac}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Right latency info */}
          {selectedNode.details.latencyMs !== null && selectedNode.details.latencyMs !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Response: {selectedNode.details.latencyMs} ms</span>
            </div>
          )}
        </div>
      )}

      {/* --- Legend Footer --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" /> Main IP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" /> Open Port
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Closed Port
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" /> Gateway
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Neighbor
          </span>
        </div>

        <span>Stationary mode active • Reacts on hover &amp; touch</span>
      </div>
    </div>
  );
}
