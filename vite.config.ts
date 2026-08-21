import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// NOTE: this app is the FED wellness product — never take over port 3000
// (WDA site) or 3100 (IG app). The server binds to PORT (default 3101).
const PORT = Number(process.env.PORT) || 3101;
export default defineConfig({
  server: {
    port: PORT,
    host: true,
    // Accept any Host header so the app works behind a proxy / tunnel too.
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      router: {
        // src/routes/api/health.ts is a server-function module (not a route);
        // keep the router generator from warning about it missing a Route export.
        // routeFileIgnorePattern is a REGEX (matched per directory entry), not a glob.
        routeFileIgnorePattern: "^api$",
      },
    }),
    viteReact(),
  ],
});
