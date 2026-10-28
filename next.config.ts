import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the deprecation noise from pg's use of module.register()
  // and let API routes that depend on DATABASE_URL stay fully dynamic.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
