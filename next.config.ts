import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera site 100% estático (pasta `out/`), hospedável grátis no
  // Firebase Hosting ou GitHub Pages — sem necessidade de servidor.
  output: "export",
  images: {
    unoptimized: true,
  },
  // Permite navegar para /login em vez de /login.html no host estático.
  trailingSlash: true,
};

export default nextConfig;
