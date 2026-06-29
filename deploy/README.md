# 部署（deploy/）

next.js-saas-admin-starter 的生产构建与 Docker 部署。镜像基于 Next.js **standalone** 输出，多阶段构建：`bun` 装依赖 + 编译 → `node:22-alpine` 运行 standalone server，最终镜像仅含最小运行产物、以非 root 用户运行。

> 前置依赖：`next.config.ts` 已开启 `output: "standalone"`。

---

## 1. 构建镜像

构建上下文**必须是仓库根**（Dockerfile 在 `deploy/` 下）：

```bash
docker build -f deploy/Dockerfile -t next.js-saas-admin-starter:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://console.example.com .
```

### Build args（构建期内联）

| Arg | 默认 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | 站点绝对地址。**生产必须改成真实地址**（影响 OG/元数据、同源 URL 解析） |
| `NEXT_PUBLIC_API_BASE_URL` | （不注入） | 真实后端基地址。不传 → 运行期回落同源 `/api` mock；传了 → 客户端直连后端 |

> `NEXT_PUBLIC_*` 是**构建期**变量（内联进客户端 bundle），改了必须重新 build。
> `AUTH_SECRET` 是**运行期**变量，不要作 build-arg。

---

## 2. 运行容器

```bash
docker run -d -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  --name next.js-saas-admin-starter next.js-saas-admin-starter:latest
```

### 运行期环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `AUTH_SECRET` | **是** | 会话 cookie 的 HMAC 签名密钥。生产未设（或沿用 dev 默认值）→ 首个鉴权请求 fail-loud |
| `NODE_ENV` | 否 | 镜像内置 `production`，一般无需覆盖 |
| `PORT` | 否 | 监听端口，默认 `3000` |
| `HOSTNAME` | 否 | 监听地址，默认 `0.0.0.0`（容器内须监听非回环，否则外部访问不到） |

---

## 3. Docker Compose 一键

```bash
cd deploy
AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d --build
# 接真实后端：
# NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
# AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d --build
```

健康检查用容器内 `node` 的全局 `fetch` 探活（`node:22-alpine` 无 curl/wget）。

---

## 4. 多架构构建（可选）

为 ARM64（如 Apple Silicon / Graviton）与 AMD64 同时出镜像：

```bash
docker buildx create --use --name gc-builder   # 仅首次
docker buildx build --platform linux/amd64,linux/arm64 \
  -f deploy/Dockerfile -t next.js-saas-admin-starter:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://console.example.com --push .
```

---

## 5. 上线检查清单

- [ ] 设置 `AUTH_SECRET`（强随机值，`openssl rand -base64 32`）
- [ ] `NEXT_PUBLIC_APP_URL` 指向真实站点地址（构建期）
- [ ] 接真实后端：设 `NEXT_PUBLIC_API_BASE_URL`，并把后端域名加入 `next.config.ts` 的 CSP `connect-src`（否则跨域 fetch 被浏览器 CSP 拦截）
- [ ] 反向代理终结 HTTPS，并正确转发 `Host`、`X-Forwarded-Proto`（HSTS / 绝对 URL 方向正确）
- [ ] 反代设置 `X-Forwarded-For`；如启用，注意 `proxy.ts` 当前仅做 cookie 存在性守卫，最终鉴权以 `getSession`（HMAC 校验）为准
