import { NextResponse } from "next/server";
import { exec } from "child_process";
import dns from "dns";
import util from "util";

// Promisify exec for clean async/await syntax
const execAsync = util.promisify(exec);

// Define TypeScript interfaces for clear data contract
interface NetworkNode {
  ip: string;
  role: "gateway" | "target" | "peer" | "broadcast";
  status: "online" | "offline" | "unreachable";
  latencyMs: number | null;
  mac: string | null;
  hostname: string | null;
  isTarget: boolean;
}

interface NetworkMapResult {
  targetIp: string;
  subnet: {
    cidr: string;
    networkAddress: string;
    broadcastAddress: string;
    estimatedGateway: string;
    totalHosts: number;
  };
  nodes: NetworkNode[];
  arpEntriesFound: number;
  scanDurationMs: number;
  timestamp: string;
}

/**
 * =====================================================================
 * HELPER: Cross-Platform Ping
 * =====================================================================
 * Works on macOS, Linux, and Windows!
 * - Windows uses: `ping -n 1 -w <ms> <ip>`
 * - macOS/Linux uses: `ping -c 1 -W <ms> <ip>`
 */
async function pingHost(ip: string, timeoutMs: number = 800): Promise<{ online: boolean; latencyMs: number | null }> {
  const isWindows = process.platform === "win32";
  const pingCmd = isWindows
    ? `ping -n 1 -w ${timeoutMs} ${ip}`
    : `ping -c 1 -W ${timeoutMs} ${ip}`;

  try {
    const { stdout } = await execAsync(pingCmd);
    
    // Parse latency from stdout (supports both Windows and Unix ping outputs)
    // Windows: "time=3ms" or "time<1ms"
    // Unix/macOS: "time=3.14 ms"
    const timeMatch = stdout.match(/time[=<]([\d.]+)\s*ms/i);
    const latency = timeMatch ? parseFloat(timeMatch[1]) : null;
    return { online: true, latencyMs: latency };
  } catch {
    // Ping failed or host is unreachable
    return { online: false, latencyMs: null };
  }
}

/**
 * =====================================================================
 * HELPER: Cross-Platform ARP Parser (`arp -a`)
 * =====================================================================
 * Reads the OS ARP cache to discover active MAC and IP pairings.
 * - macOS/Linux format: "? (192.168.1.1) at 0:9:f:9:2:20 on en0 ..."
 * - Windows format:     "  192.168.1.1       00-11-22-33-44-55     dynamic"
 */
async function getArpEntries(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { stdout } = await execAsync("arp -a");
    const lines = stdout.split("\n");

    for (const line of lines) {
      // 1. Check macOS / Linux format
      const unixMatch = line.match(/\(([\d.]+)\)\s+at\s+([a-fA-F0-9:]+)/);
      if (unixMatch) {
        map.set(unixMatch[1], unixMatch[2]);
        continue;
      }

      // 2. Check Windows format
      const winMatch = line.match(/^\s*([\d.]+)\s+([a-fA-F0-9-]{11,17})\s+/);
      if (winMatch) {
        // Normalize Windows hyphens (00-11-22) to standard colons (00:11:22)
        const macFormatted = winMatch[2].replace(/-/g, ":");
        map.set(winMatch[1], macFormatted);
      }
    }
  } catch (err) {
    console.warn("Could not read ARP table:", err);
  }
  return map;
}

/**
 * =====================================================================
 * HELPER: Reverse DNS lookup
 * =====================================================================
 * Resolves an IP into a human-friendly hostname if registered in DNS.
 */
async function resolveHostname(ip: string): Promise<string | null> {
  try {
    const hostnames = await dns.promises.reverse(ip);
    return hostnames[0] || null;
  } catch {
    return null;
  }
}

/**
 * =====================================================================
 * API ROUTE: /api/map-network?ip=X.X.X.X
 * =====================================================================
 * Maps out the local network surrounding the provided IP address.
 */
export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const ipParam = searchParams.get("ip");

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipParam || !ipv4Regex.test(ipParam)) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid IPv4 address must be provided in the 'ip' query parameter (e.g. 192.168.1.1).",
      },
      { status: 400 }
    );
  }

  try {
    // 1. Calculate /24 Subnet parameters
    const octets = ipParam.split(".").map(Number);
    const networkBase = `${octets[0]}.${octets[1]}.${octets[2]}`;
    const networkAddress = `${networkBase}.0`;
    const broadcastAddress = `${networkBase}.255`;
    const estimatedGateway = `${networkBase}.1`;

    // 2. Fetch the current ARP cache on the machine
    const arpTable = await getArpEntries();

    // 3. Define candidates to scan
    // We scan:
    // - The default gateway (e.g. .1)
    // - The target IP entered by the user
    // - Any IPs already discovered in the ARP table that belong to this subnet
    const ipCandidates = new Set<string>();
    ipCandidates.add(estimatedGateway);
    ipCandidates.add(ipParam);

    // Add neighbor hosts in the same /24 subnet found in ARP table
    for (const [arpIp] of arpTable) {
      if (arpIp.startsWith(networkBase + ".")) {
        ipCandidates.add(arpIp);
      }
    }

    // 4. Ping and resolve details for each candidate in parallel
    const nodes: NetworkNode[] = await Promise.all(
      Array.from(ipCandidates).map(async (ip) => {
        const isTarget = ip === ipParam;
        const isGateway = ip === estimatedGateway;
        const mac = arpTable.get(ip) || null;

        // Perform ping check
        const { online, latencyMs } = await pingHost(ip);

        // Attempt reverse DNS
        const hostname = await resolveHostname(ip);

        let role: NetworkNode["role"] = "peer";
        if (isGateway) role = "gateway";
        else if (isTarget) role = "target";

        return {
          ip,
          role,
          status: online ? "online" : "offline",
          latencyMs,
          mac,
          hostname,
          isTarget,
        };
      })
    );

    // Sort nodes logically: Gateway first, then target, then others numerically
    nodes.sort((a, b) => {
      if (a.role === "gateway") return -1;
      if (b.role === "gateway") return 1;
      if (a.isTarget) return -1;
      if (b.isTarget) return 1;
      const lastA = parseInt(a.ip.split(".")[3], 10);
      const lastB = parseInt(b.ip.split(".")[3], 10);
      return lastA - lastB;
    });

    // 5. Structure the complete network discovery response
    const scanDurationMs = Date.now() - startTime;
    const responsePayload: NetworkMapResult = {
      targetIp: ipParam,
      subnet: {
        cidr: `${networkAddress}/24`,
        networkAddress,
        broadcastAddress,
        estimatedGateway,
        totalHosts: 254,
      },
      nodes,
      arpEntriesFound: arpTable.size,
      scanDurationMs,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responsePayload,
    });
  } catch (error: any) {
    console.error("Network mapping error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to map out the network.",
      },
      { status: 500 }
    );
  }
}
