# deps stage — 모든 의존성 설치 (빌드용)
FROM node:22.19.0-alpine AS deps
WORKDIR /app
RUN npm install -g npm@11.13.0 
COPY package.json package-lock.json ./
# RUN npm ci
RUN npm install --legacy-peer-deps

# builder stage — Next.js standalone 빌드
FROM node:22.19.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# runner stage — 최소 런타임 이미지
FROM node:22.19.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone 빌드 결과물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
