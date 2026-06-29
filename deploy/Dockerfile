# syntax=docker/dockerfile:1.7
# =============================================================================
# gc-Console 生产镜像 —— Next.js standalone 输出（自含最小 node_modules）
#
# 多阶段：bun 装依赖 + 编译 → node:22-alpine 运行 standalone server。
# 最终镜像仅含运行所需产物、以非 root 用户运行。
#
# 构建（上下文须为仓库根）：
#   docker build -f deploy/Dockerfile -t gc-console:latest \
#     --build-arg NEXT_PUBLIC_APP_URL=https://console.example.com .
#     # 接真实后端再加：--build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com
#
# 运行（AUTH_SECRET 为运行期必填）：
#   docker run -p 3000:3000 -e AUTH_SECRET=$(openssl rand -base64 32) gc-console:latest
#
# 详见 deploy/README.md。
# =============================================================================

############################
# 1. deps：装依赖（利用层缓存）
############################
FROM oven/bun:1.3 AS deps
WORKDIR /app
# 仅 copy 依赖清单，依赖不变时命中缓存
COPY package.json bun.lock ./
# 不设 NODE_ENV=production：构建需要 devDependencies（typescript 等）
RUN bun install --frozen-lockfile

############################
# 2. builder：编译 standalone 产物
############################
FROM oven/bun:1.3 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 在构建期内联进客户端 bundle，故作 build-arg 传入
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_BASE_URL=
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
# 仅在显式提供时注入 API base：留空字符串会让 t3-env 的 .url().optional() 校验失败，
# 故保持「未提供即不注入（回落同源 /api mock）」的语义
RUN if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then \
      export NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL"; \
    fi && bun run build

############################
# 3. runner：最小运行镜像
############################
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
# standalone 自带运行所需 node_modules，runner 无需重装
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
# Next standalone server 监听 $HOSTNAME:$PORT
CMD ["node", "server.js"]
