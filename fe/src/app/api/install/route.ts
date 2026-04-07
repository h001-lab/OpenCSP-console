import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/install?proxy=<teleport-proxy>&host=<vm-hostname>&user=<ssh-user>
 *
 * 인증 불필요 — 공개 엔드포인트.
 * tsh login은 이미 완료된 상태를 가정.
 * tsh config 로 ~/.ssh/config 에 ProxyJump 설정만 추가.
 *
 * proxy 파라미터는 scheme 포함(https://...) 또는 hostname:port 형식 모두 허용.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const proxy = searchParams.get("proxy") ?? "";
  const host  = searchParams.get("host")  ?? "<vm-hostname>";
  const user  = searchParams.get("user")  ?? "ubuntu";

  const script = `#!/bin/bash
set -e

TELEPORT_PROXY="${proxy}"
VM_HOST="${host}"
SSH_USER="${user}"

# scheme 제거 후 hostname만 추출 (https://teleport.example.com:443 -> teleport.example.com)
PROXY_HOST="\${TELEPORT_PROXY#*://}"   # strip scheme
PROXY_HOST="\${PROXY_HOST%%:*}"        # strip port

echo ""
echo "=== OpenCSP SSH Access Setup ==="
echo "  proxy : $PROXY_HOST"
echo "  target: $SSH_USER@$VM_HOST.$PROXY_HOST"
echo ""

# ── 1. Install tsh ────────────────────────────────────────────────────────────
echo "[1/2] Checking tsh installation..."
if command -v tsh &>/dev/null; then
  echo "  ✓ tsh already installed ($(tsh version 2>/dev/null | head -1 || echo 'unknown version'))"
else
  echo "  Installing tsh..."
  if [[ "$(uname)" == "Darwin" ]]; then
    brew install teleport
  else
    curl -fsSL https://goteleport.com/static/install.sh | bash -s -- latest
    sudo install -m 755 teleport/tsh /usr/local/bin/tsh 2>/dev/null || true
    rm -rf teleport 2>/dev/null || true
  fi
  echo "  ✓ tsh installed"
fi

# ── 2. Configure SSH (OpenSSH ProxyJump via tsh) ──────────────────────────────
echo "[2/2] Configuring SSH..."
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# hostname으로 중복 체크 (scheme/port 무관하게 비교)
if grep -q "$PROXY_HOST" ~/.ssh/config 2>/dev/null; then
  echo "  ✓ ~/.ssh/config already configured for this proxy"
else
  tsh config --proxy="$PROXY_HOST" >> ~/.ssh/config
  chmod 600 ~/.ssh/config
  echo "  ✓ ~/.ssh/config updated"
fi

# short hostname alias 추가:
# HostName 만으로는 *.proxy-host 패턴이 매칭 안 되어 Port/ProxyCommand 미상속
# → Port 3022, ProxyCommand 를 alias 블록에 직접 포함
TSH_BIN="\$(command -v tsh)"
TSH_USER="\$(ls "\$HOME/.tsh/keys/\$PROXY_HOST/" 2>/dev/null | head -1)"

if grep -q "^Host \$VM_HOST\$" ~/.ssh/config 2>/dev/null; then
  echo "  ✓ Host alias already exists for \$VM_HOST"
else
  cat >> ~/.ssh/config << SSHEOF

Host \$VM_HOST
    UserKnownHostsFile "\$HOME/.tsh/known_hosts"
    IdentityFile "\$HOME/.tsh/keys/\$PROXY_HOST/\$TSH_USER"
    CertificateFile "\$HOME/.tsh/keys/\$PROXY_HOST/\$TSH_USER-ssh/\$PROXY_HOST-cert.pub"
    Port 3022
    ProxyCommand "\$TSH_BIN" proxy ssh --cluster=\$PROXY_HOST --proxy=\$PROXY_HOST:443 %r@%h.\$PROXY_HOST:%p
SSHEOF
  echo "  ✓ Host alias added for \$VM_HOST"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup Complete ==="
echo ""
echo "  Connect to your VM:"
echo "  \\$ ssh $SSH_USER@$VM_HOST"
echo ""
`;

  return new NextResponse(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
