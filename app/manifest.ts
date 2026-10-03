import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sri Allada Hospitals",
    short_name: "Allada Care",
    description: "Hospital administration and patient access",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fa",
    theme_color: "#127b70",
    icons: [
      {
        src: "/carewell.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
