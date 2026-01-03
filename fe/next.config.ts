import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@h001/ui"],
};

export default config;