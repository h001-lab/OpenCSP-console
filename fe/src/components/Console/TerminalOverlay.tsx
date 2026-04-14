"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Terminal } from "xterm";

// 동일한 crName+login에 대한 동시 세션 생성 요청을 deduplicate한다.
// React StrictMode가 useEffect를 mount→cleanup→remount 순서로 두 번 실행하면
// 두 init() 모두 fetch를 dispatch하기 전에 cleanup이 동기적으로 실행되므로,
// 두 번째 mount도 pending Promise를 재사용해 세션을 한 번만 생성한다.
const pendingSessionCreations = new Map<string, Promise<string>>();

function createSession(userId: string, crName: string, login: string, errorFallback: string): Promise<string> {
  const key = `${userId}::${crName}::${login}`;
  const existing = pendingSessionCreations.get(key);
  if (existing) return existing;

  const promise = fetch("/api/console/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crName, login }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? json.error ?? errorFallback);
      }
      return res.json();
    })
    .then((json) => {
      const sessionId: string = json.data?.sessionId ?? json.sessionId;
      if (!sessionId) throw new Error("Failed to receive session ID");
      return sessionId;
    })
    .finally(() => {
      pendingSessionCreations.delete(key);
    });

  pendingSessionCreations.set(key, promise);
  return promise;
}
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useMsg } from "@/providers/MessagesProvider";

interface ConsoleMessages {
  status: { connecting: string; connected: string; disconnected: string; error: string };
  close: string;
  title: string;
  connectionFailed: string;
  sessionCreateFailed: string;
  sessionIdMissing: string;
  connectingMsg: string;
  connectedMsg: string;
  disconnectedMsg: string;
  wsError: string;
  wsErrorMsg: string;
}

interface Props {
  /** 인스턴스 CR 이름 (표시용) */
  crName: string;
  /** SSH 로그인 계정 */
  login?: string;
  onClose: () => void;
}

type Status = "connecting" | "connected" | "disconnected" | "error";

export default function TerminalOverlay({ crName, login = "root", onClose }: Props) {
  const userId    = useAuthStore((s) => s.user?.id ?? "anonymous");
  const termRef   = useRef<HTMLDivElement>(null);
  const termInst  = useRef<Terminal | null>(null);
  const fitAddon  = useRef<FitAddon | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  // const initialized = useRef(false);
  const t = useMsg("Console") as unknown as ConsoleMessages | undefined;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    // if (initialized.current) return;
    // initialized.current = true;
    
    let inputBuffer = "";
    let echoSkipBuffer = ""; // 서버에서 돌아올 때 무시할 문자열 (ANSI 제외)
    let isRawMode = false; // raw 모드 (VI 등 단축키 같은거 프로세스가 직접 처리할 경우)
    let cancelled = false;

    async function init() {
      // 세션 생성 요청
      let sessionId: string;
      try {
        sessionId = await createSession(userId, crName, login, tRef.current?.sessionCreateFailed ?? "Session creation failed");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(e instanceof Error ? e.message : (tRef.current?.sessionCreateFailed ?? "Session creation failed"));
        }
        return;
      }

      if (cancelled || !termRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
        convertEol: true,
        theme: {
          background: "#1e1e2e",
          foreground: "#cdd6f4",
          cursor:     "#f5e0dc",
          black:      "#45475a",
          red:        "#f38ba8",
          green:      "#a6e3a1",
          yellow:     "#f9e2af",
          blue:       "#89b4fa",
          magenta:    "#f5c2e7",
          cyan:       "#89dceb",
          white:      "#bac2de",
        },
        scrollback: 5000,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();
      termInst.current = term;
      fitAddon.current = fit;

      term.writeln(`\x1b[36m${tRef.current?.connectingMsg ?? "Connecting to console..."}\x1b[0m`);

      const beWsUrl = process.env.NEXT_PUBLIC_BE_WS_URL;
      const wsBase = beWsUrl
        ? beWsUrl.replace(/^http/, "ws")
        : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
      const ws = new WebSocket(`${wsBase}/api/console/ws/${sessionId}`);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setStatus("connected");
        term.writeln(`\x1b[32m${tRef.current?.connectedMsg ?? "Connected"}\x1b[0m\r\n`);
        fit.fit();
        
        const { cols, rows } = term;
        ws.send(JSON.stringify({ type: "resize", cols, rows })); // 초기 리사이즈 전송
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        if (event.data instanceof ArrayBuffer) {
          let incomingData = new TextDecoder().decode(event.data);

          // vi 진입/종료 감지 (전체 화면 앱 진입 시 터미널이 바로 전송 모드로 전환되어야 함)
          if (incomingData.includes("\x1b[?1049h")) {
            isRawMode = true;
            echoSkipBuffer = ""; 
            inputBuffer = "";
          } else if (incomingData.includes("\x1b[?1049l")) {
            isRawMode = false;
          }

          if (isRawMode) {
            term.write(incomingData);
            return;
          }

          // echoSkipBuffer에 내용이 있는 동안만 작동
          if (echoSkipBuffer.length > 0) {
            // 1ANSI 제어 문자를 무시하고 실제 텍스트만 비교하기 위한 정규식 (서버가 보낸 데이터에서 제어 문자는 터미널에 실행시키고, 텍스트만 버퍼와 비교)
            const ansiRegex = /^\x1b\[[0-9;?]*[a-zA-Z]/;

            while (incomingData.length > 0 && echoSkipBuffer.length > 0) {
              const match = incomingData.match(ansiRegex);
              if (match) {
                term.write(match[0]);  // ANSI 코드는 필터링하지 않고 바로 터미널에 적용 (커서 위치 등 중요함)
                incomingData = incomingData.slice(match[0].length);
                continue;
              }

              // 글자 비교 (개행 문자는 \r, \n 유연하게 처리)
              const charIn = incomingData[0];
              const charSkip = echoSkipBuffer[0];

              if (charIn === charSkip || (charIn === '\n' && charSkip === '\r')) {
                incomingData = incomingData.slice(1);
                echoSkipBuffer = echoSkipBuffer.slice(1);
              } else {
                echoSkipBuffer = "";
                break;
              }
            }
          }

          if (incomingData) {
            term.write(incomingData);
          }
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("disconnected");
        term.writeln(`\r\n\x1b[33m${tRef.current?.disconnectedMsg ?? "Connection closed"}\x1b[0m`);
      };

      ws.onerror = () => {
        if (cancelled) return;
        setStatus("error");
        setErrMsg(tRef.current?.wsError ?? "WebSocket connection error");
        term.writeln(`\r\n\x1b[31m${tRef.current?.wsErrorMsg ?? "Connection error"}\x1b[0m`);
      };

      term.onData((data) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        if (isRawMode) {
          ws.send(new TextEncoder().encode(data));
          return;
        }

        if (data === "\r") { // Enter
          echoSkipBuffer = inputBuffer + "\r\n";
          ws.send(new TextEncoder().encode(inputBuffer + "\n"));
          term.write("\r\n");
          inputBuffer = "";
        } 
        else if (data === "\u007F") { // Backspace
          if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
            term.write("\b \b");
          }
        } 
        else {
          inputBuffer += data;
          term.write(data);
        }
      });

      term.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });
    }

    init();

    // 윈도우 리사이즈 → fit
    const handleResize = () => fitAddon.current?.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      wsRef.current?.close();
      termInst.current?.dispose();
    };
  }, [crName, login]);

  const statusColor: Record<Status, string> = {
    connecting:   "text-yellow-400",
    connected:    "text-green-400",
    disconnected: "text-gray-400",
    error:        "text-red-400",
  };
  const statusLabel: Record<Status, string> = {
    connecting:   t?.status.connecting   ?? "Connecting",
    connected:    t?.status.connected    ?? "Connected",
    disconnected: t?.status.disconnected ?? "Disconnected",
    error:        t?.status.error        ?? "Error",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1e1e2e] border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.15)" }}
          className="flex items-center justify-center w-7 h-7 rounded text-white hover:brightness-125 transition-all shrink-0"
          title={t?.close ?? "Close"}
        >
          <span className="text-base leading-none select-none">←</span>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-white/60 text-xs font-mono">{t?.title ?? "Console"}</span>
          <span className="text-white text-xs font-mono font-semibold">{crName}</span>
          <span className="text-white/40 text-xs font-mono">@{login}</span>
        </div>
        <span className={`text-xs font-medium ${statusColor[status]}`}>
          ● {statusLabel[status]}
        </span>
      </div>

      {/* 터미널 영역 */}
      <div className="flex-1 overflow-hidden p-2">
        {status === "error" && errMsg ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <p className="text-red-400 text-sm mb-2">{t?.connectionFailed ?? "Connection failed"}</p>
              <p className="text-white/60 text-xs">{errMsg}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                {t?.close ?? "Close"}
              </button>
            </div>
          </div>
        ) : (
          <div ref={termRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
