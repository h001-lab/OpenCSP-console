import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@h001/ui"],
  // Next.js standalone 모드 활성화
  // output: "standalone",
  // outputFileTracingIncludes: {
  //   "/**/*": [
  //     "./node_modules/next-auth/**/*",
  //     "./node_modules/@auth/**/*",
  //     "./node_modules/oauth4webapi/**/*",
  //     "./node_modules/jose/**/*",
  //     "./node_modules/preact/**/*",
  //     "./node_modules/preact-render-to-string/**/*",
  //   ],
  // },
};

export default config;