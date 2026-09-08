import { NextResponse } from "next/server";
import net from "net";

/**
 * =====================================================================
 * API ROUTE: /api/scan-ports?ip=X.X.X.X
 * =====================================================================
 * PURPOSE:
 * Checks whether specific TCP ports are OPEN or CLOSED on a target IP.
 * Uses Node's native `net.Socket` to initiate a lightweight TCP handshake.
 * 
 * HOW IT WORKS:
 * - If the socket connects successfully -> Port is OPEN.
 * - If the socket receives ECONNREFUSED or errors -> Port is CLOSED.
 * - If the socket times out without a response -> Port is FILTERED/CLOSED.
 * 
 * ADVANTAGES:
 * - Pure Node.js (no external binaries, works on macOS, Linux, and Windows).
 * - Fast and non-blocking with concurrent promises.
 * =====================================================================
 */

export interface PortDefinition {
  port: number;
  service: string;
  description: string;
}

// List of commonly inspected ports across home, office, and developer networks
export const COMMON_PORTS: PortDefinition[] = [
  { port: 21, service: "FTP", description: "File Transfer Protocol" },
  { port: 22, service: "SSH", description: "Secure Shell remote login" },
  { port: 25, service: "SMTP", description: "Mail routing" },
  { port: 53, service: "DNS", description: "Domain Name System resolution" },
  { port: 80, service: "HTTP", description: "Standard Web Server" },
  { port: 110, service: "POP3", description: "Email retrieval" },
  { port: 143, service: "IMAP", description: "Email sync" },
  { port: 443, service: "HTTPS", description: "Encrypted Web Server (SSL/TLS)" },
  { port: 3000, service: "Dev / Next.js", description: "Local React/Next.js dev server" },
  { port: 3306, service: "MySQL", description: "MySQL database server" },
  { port: 5432, service: "PostgreSQL", description: "PostgreSQL database server" },
  { port: 6379, service: "Redis", description: "In-memory database / cache" },
  { port: 8080, service: "HTTP-Alt", description: "Alternative web proxy/server" },
  { port: 8443, service: "HTTPS-Alt", description: "Alternative secure web proxy" },
];

export interface PortScanResult {
  port: number;
  service: string;
  description: string;
  status: "open" | "closed";
  latencyMs: number | null;
}

/**
 * Helper function to check an individual port using net.Socket
 */
function probePort(
  host: string,
  port: number,
  timeoutMs: number = 1200
): Promise<{ status: "open" | "closed"; latencyMs: number | null }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    // Set connection timeout
    socket.setTimeout(timeoutMs);

    // If socket connects successfully, port is OPEN
    socket.on("connect", () => {
      const latencyMs = Date.now() - startTime;
      socket.destroy();
      resolve({ status: "open", latencyMs });
    });

    // If timeout occurs without response, consider port CLOSED / filtered
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: "closed", latencyMs: null });
    });

    // If connection is refused or errors out, port is CLOSED
    socket.on("error", () => {
      socket.destroy();
      resolve({ status: "closed", latencyMs: null });
    });

    // Attempt connection
    try {
      socket.connect(port, host);
    } catch {
      socket.destroy();
      resolve({ status: "closed", latencyMs: null });
    }
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ipParam = searchParams.get("ip");

  // Validate IPv4 format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipParam || !ipv4Regex.test(ipParam)) {
    return NextResponse.json(
      {
        success: false,
        error: "A valid IPv4 address must be provided in the 'ip' query parameter.",
      },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    // Scan all common ports concurrently using Promise.all
    const results: PortScanResult[] = await Promise.all(
      COMMON_PORTS.map(async (def) => {
        const probe = await probePort(ipParam, def.port);
        return {
          port: def.port,
          service: def.service,
          description: def.description,
          status: probe.status,
          latencyMs: probe.latencyMs,
        };
      })
    );

    // Calculate summary statistics
    const openCount = results.filter((r) => r.status === "open").length;
    const closedCount = results.filter((r) => r.status === "closed").length;
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        targetIp: ipParam,
        ports: results,
        summary: {
          total: results.length,
          open: openCount,
          closed: closedCount,
          durationMs,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Port scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to complete port scan.",
      },
      { status: 500 }
    );
  }
}
