# Next.js Network Inspector & Topology Mapper Template

A lightweight, well-commented Next.js starter template designed for working with network interfaces, IP addresses, and local network discovery.

---

## Features

1. **Center IP Input Box**:
   - Located in the center of the web app (`src/app/page.tsx`).
   - Supports input validation for IPv4 format.
   - Includes quick actions to clear or fill with test values.
2. **Box 1 — Local MacBook Interface (`en0`)**:
   - Fetches network adapter data from `/api/local-ip`.
   - Uses Node's `os.networkInterfaces()` to extract IPv4, IPv6, Netmask, CIDR, and MAC address.
   - Includes a "Use as Target" button to instantly pass the local IP to the central input box.
3. **Box 2 — Network & Port Tree Mapper**:
   - Maps out the network of the entered IP as an elegant **Hierarchical Tree**:
     - **Level 1 (Root)**: Default Gateway / Router (e.g. `145.28.239.1`)
     - **Level 2 (Hub)**: Subnet Domain (e.g. `145.28.239.0/24`)
     - **Level 3 (Target Host)**: Target IP with latency, hostname, and MAC
     - **Level 4 (Leaves)**: **TCP Ports Tree** (probes open vs closed ports like 80, 443, 3000, 22, 3306, 5432 with latency and service descriptions)
     - **Level 3 (Peers)**: Discovered neighbor devices from the macOS ARP cache.
   - Includes filter toggles ("Open Only" vs "All") and smooth expand/collapse branches.

---

## Getting Started

### 1. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 2. Build for Production
```bash
npm run build
npm start
```

---

## File Structure & Where to Work

- **`src/app/page.tsx`**: The main page layout containing the central IP input box and arranging Box 1 and Box 2.
- **`src/components/LocalIpCard.tsx`**: Box 1 UI component.
- **`src/components/NetworkMapCard.tsx`**: Box 2 UI component.
- **`src/app/api/local-ip/route.ts`**: Backend route inspecting macOS `en0` network interface.
- **`src/app/api/map-network/route.ts`**: Backend route computing subnet boundaries, scanning ARP entries, and pinging hosts.
