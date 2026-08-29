// Starts `next dev` over HTTPS bound to this machine's LAN IP, so a phone on
// the same network can load the app from a *secure* origin.
//
// Why this exists: browsers only expose geolocation (and camera, service
// workers, etc.) on secure origins. `localhost` counts as one, but a plain
// `http://192.168.x.x:3000` does not — which is why the live map's location
// sharing silently fails when testing on a real phone over the LAN.
//
// Next generates the certificate for `localhost`, `127.0.0.1`, `::1` and
// whatever `-H` is set to, so binding to the LAN IP is what gets that IP
// covered by the cert (see next/dist/lib/mkcert.js).

import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { readFileSync } from "node:fs";

function findLanAddress() {
  const interfaces = networkInterfaces();
  // en0/en1 are the usual Wi-Fi/Ethernet interfaces on macOS; fall back to
  // whatever external IPv4 exists so this still works elsewhere.
  const preferred = ["en0", "en1"];
  const names = [...preferred, ...Object.keys(interfaces).filter((n) => !preferred.includes(n))];

  for (const name of names) {
    for (const net of interfaces[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

const host = findLanAddress();
if (!host) {
  console.error("Could not find a LAN IPv4 address. Are you connected to a network?");
  process.exit(1);
}

// allowedDevOrigins is static config, so a new network (new IP) needs it updated
// or Next will block the phone's cross-origin requests for CSS/JS/HMR.
try {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  if (!config.includes(host)) {
    console.warn(
      `\n  Warning: ${host} is not in allowedDevOrigins in next.config.ts.\n` +
        `  Add it or the phone will fail to load CSS/JS.\n`,
    );
  }
} catch {
  // Config unreadable is not worth failing the dev server over.
}

console.log(`\n  Serving over HTTPS at https://${host}:3000`);
console.log("  On the phone: open that URL and accept the certificate warning,");
console.log("  or install mkcert's rootCA.pem (path is logged below) to trust it.\n");

const child = spawn(
  "npx",
  ["next", "dev", "--turbopack", "--experimental-https", "-H", host],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 0));
