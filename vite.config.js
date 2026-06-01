import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ngrokHost = env.NGROK_HOST || env.VITE_NGROK_HOST;

  return {
    server: {
      host: true,
      allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io"],
      ...(ngrokHost
        ? {
            hmr: {
              host: ngrokHost,
              protocol: "wss",
              clientPort: 443,
            },
          }
        : {}),
    },
    preview: {
      host: true,
      allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io"],
      ...(ngrokHost
        ? {
            hmr: {
              host: ngrokHost,
              protocol: "wss",
              clientPort: 443,
            },
          }
        : {}),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: {
          enabled: env.VITE_ENABLE_SW === "true",
          type: "module",
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
        includeAssets: ["icon.svg", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
        name: "DiscCheck",
        short_name: "DiscCheck",
        description: "Weekly pickup ultimate RSVPs, go/no-go calls, and game chat.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        },
      }),
    ],
  };
});
