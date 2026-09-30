import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cronometragem 3 km",
    short_name: "Corrida 3 km",
    description: "Cronometragem, chegada e classificação da corrida de 3 km",
    lang: "pt-BR",
    start_url: "/chegada",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Chegada", url: "/chegada" },
      { name: "Resultados", url: "/resultados" },
      { name: "Telão", url: "/telao" },
    ],
  };
}
