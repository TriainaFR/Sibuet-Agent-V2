import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Chargement d'un fichier de réservations (Excel ou CSV) depuis « Vos données ».
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
