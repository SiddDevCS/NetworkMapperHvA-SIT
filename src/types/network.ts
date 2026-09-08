/**
 * Shared TypeScript types for Network Topology and Port Scanning
 */

export interface NetworkNode {
  ip: string;
  role: "gateway" | "target" | "peer" | "broadcast";
  status: "online" | "offline" | "unreachable";
  latencyMs: number | null;
  mac: string | null;
  hostname: string | null;
  isTarget: boolean;
}

export interface PortItem {
  port: number;
  service: string;
  description: string;
  status: "open" | "closed";
  latencyMs: number | null;
}

export interface SubnetInfo {
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  estimatedGateway: string;
  totalHosts: number;
}

export interface PortScanSummary {
  total: number;
  open: number;
  closed: number;
  durationMs: number;
}
