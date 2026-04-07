"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

interface Props {
  /** 인스턴스 CR 이름 (표시용) */
  crName: string;
  /** SSH 로그인 계정 */
  login?: string;
  onClose: () => void;
}

type Status = "connecting" | "connected" | "disconnected" | "error";

export default function TerminalOverlay({ crName, login = "root", onClose }: Props) {
  const termRef   = useRef<HTMLDivElement>(null);
  const termInst  = useRef<Terminal | null>(null);
  const fitAddon  = useRef<FitAddon | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. 세션 생성 요청
      let sessionId: string;
      try {
        const res = await fetch("/api/console/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ crName, login }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.message ?? json.error ?? "세션 생성 실패");
        }
        const json = await res.json();
        sessionId = json.data?.sessionId ?? json.sessionId;
        if (!sessionId) throw new Error("sessionId를 받지 못했습니다.");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(e instanceof Error ? e.message : "세션 생성 실패");
        }
        return;
      }

      if (cancelled || !termRef.current) return;

      // 2. xterm.js 초기화
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
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

      term.writeln("\x1b[36m콘솔 연결 중...\x1b[0m");

      // 3. WebSocket 연결 (BE → Teleport 프록시)
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
        term.writeln("\x1b[32m연결됨\x1b[0m\r\n");
        fit.fit();
        // 초기 리사이즈 전송
        const { cols, rows } = term;
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("disconnected");
        term.writeln("\r\n\x1b[33m연결 종료\x1b[0m");
      };

      ws.onerror = () => {
        if (cancelled) return;
        setStatus("error");
        setErrMsg("WebSocket 연결 오류");
        term.writeln("\r\n\x1b[31m연결 오류\x1b[0m");
      };

      // xterm → BE: 키 입력 전송
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(new TextEncoder().encode(data));
        }
      });

      // xterm → BE: 리사이즈 전송
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
    connecting:   "연결 중",
    connected:    "연결됨",
    disconnected: "연결 종료",
    error:        "오류",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1e1e2e] border-b border-white/10 shrink-0">
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.15)" }}
          className="flex items-center justify-center w-7 h-7 rounded text-white hover:brightness-125 transition-all shrink-0"
          title="닫기"
        >
          <span className="text-base leading-none select-none">←</span>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-white/60 text-xs font-mono">콘솔</span>
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
              <p className="text-red-400 text-sm mb-2">연결 실패</p>
              <p className="text-white/60 text-xs">{errMsg}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                닫기
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
