import type { MetadataRoute } from "next";

// PWA: instalable desde el navegador del celular ("Agregar a pantalla de inicio").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inversiones Chicas",
    short_name: "Mi cartera",
    description: "Cómo viene creciendo tu plata, en dólares.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#0B2545",
    lang: "es-AR",
    icons: [
      { src: "/icono/192", sizes: "192x192", type: "image/png" },
      { src: "/icono/512", sizes: "512x512", type: "image/png" },
      { src: "/icono/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
