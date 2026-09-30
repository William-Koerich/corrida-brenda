import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // permite abrir o servidor de desenvolvimento pelo celular na rede local (ex.: 192.168.1.30)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],

  async headers() {
    return [
      {
        // o navegador precisa sempre buscar a versão nova do service worker
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
