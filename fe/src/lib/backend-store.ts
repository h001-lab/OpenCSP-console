/**
 * 백엔드 URL을 로컬 파일(.backend-config.json)에 영속적으로 저장하는 서버사이드 모듈.
 * 파일이 없거나 읽기 실패 시 BACKEND_URL 환경변수로 fallback.
 */
import fs from "fs";
import path from "path";

const CONFIG_PATH = process.env.BACKEND_CONFIG_PATH
  ?? path.join(process.cwd(), ".backend-config.json");
const ENV_DEFAULT = process.env.BACKEND_URL ?? "http://localhost:8080";

interface BackendConfig {
  url: string;
}

export function getBackendUrl(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config: BackendConfig = JSON.parse(raw);
    if (config.url?.trim()) return config.url.trim();
  } catch {
    // 파일 없음 or 파싱 실패 → env fallback
  }
  return ENV_DEFAULT;
}

export function saveBackendUrl(url: string): void {
  const config: BackendConfig = { url: url.trim() };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getEnvDefault(): string {
  return ENV_DEFAULT;
}
