import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@h001/ui"],
  // Docker 컨테이너 빌드용 standalone 출력 모드
  // standalone 모드: .next/standalone/ 에 server.js + 필요한 node_modules만 포함
  output: "standalone",
};

export default config;