import { NextResponse } from "next/server";
import os from "os";

/**
 * =====================================================================
 * API ROUTE: /api/local-ip
 * =====================================================================
 * PURPOSE:
 * This API endpoint inspects the host machine's network interfaces using
 * Node's built-in "os" module and extracts IP information for the "en0"
 * interface (the default Wi-Fi/Ethernet interface on macOS / MacBooks).
 * 
 * HOW TO EXTEND / CUSTOMIZE:
 * - If you are on Linux or Windows, the interface name might be "eth0" or "Wi-Fi".
 * - You can change the target interface by modifying the `TARGET_INTERFACE` constant below.
 * =====================================================================
 */

export async function GET() {
  try {
    // 1. Fetch all network interfaces available on this machine
    const interfaces = os.networkInterfaces();
    const isWindows = process.platform === "win32";

    // 2. Select interface:
    // - On macOS, default is typically "en0" (Wi-Fi or Ethernet)
    // - On Windows, default is usually "Wi-Fi" or "Ethernet"
    // - On Linux, default is usually "eth0" or "wlan0"
    // We check "en0" first, and if not present, we auto-discover the active external IPv4 interface!
    let chosenInterfaceName = "en0";
    let targetInfo = interfaces[chosenInterfaceName];

    if (!targetInfo) {
      // Auto-detect first non-internal interface with an IPv4 address
      for (const [name, records] of Object.entries(interfaces)) {
        if (!records) continue;
        const hasExternalIpv4 = records.some((r) => r.family === "IPv4" && !r.internal);
        if (hasExternalIpv4) {
          chosenInterfaceName = name;
          targetInfo = records;
          break;
        }
      }
    }

    if (!targetInfo || targetInfo.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No active network interface found. Detected OS: ${process.platform}`,
          availableInterfaces: Object.keys(interfaces),
          suggestion: "Ensure Wi-Fi or Ethernet is connected.",
        },
        { status: 404 }
      );
    }

    // 4. Separate IPv4 and IPv6 records for this interface
    const ipv4Record = targetInfo.find((item) => item.family === "IPv4");
    const ipv6Record = targetInfo.find((item) => item.family === "IPv6");

    // 5. Structure the response data clearly for the frontend
    const responseData = {
      success: true,
      interface: chosenInterfaceName,
      platform: process.platform,
      ipv4: ipv4Record?.address || null,
      ipv6: ipv6Record?.address || null,
      netmask: ipv4Record?.netmask || null,
      cidr: ipv4Record?.cidr || null,
      mac: ipv4Record?.mac || targetInfo[0]?.mac || null,
      isInternal: ipv4Record?.internal || false,
      timestamp: new Date().toISOString(),
      // Also return other available interface names in case you want to inspect others
      allInterfaces: Object.keys(interfaces),
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error fetching local IP:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve network interface info.",
      },
      { status: 500 }
    );
  }
}
