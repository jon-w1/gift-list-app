import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gift Lists",
    short_name: "Gift Lists",
    description: "Wishlists, gift ideas and suggestions for family & friends.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f5f0",
    theme_color: "#f8f5f0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
