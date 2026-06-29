#!/usr/bin/env node
// fetch-undraw.mjs
// -----------------------------------------------------------------------------
// 自动从 undraw 镜像拉取插画 → 着色(currentColor) →（可选）生成可直接 import 的内联 React 组件。
// 免去手工到 undraw.co 下载。着色逻辑复用 ./undraw-recolor.mjs 的 recolorSvg。
//
// 两个互补镜像（着色时各用各的主色写法）：
//   - cuuupid/undraw-illustrations  （master，svg/，命名带哈希；主色 #6c63ff，~417 张）
//   - balazser/undraw-svg-collection（main，  svgs/，命名干净；  主色 var(--primary-svg-color)+深灰族，~1362 张，auth 类更全）
//
// 用法：
//   node fetch-undraw.mjs <query> [--from #6c63ff] [--out path.svg] [--component [path.tsx]] [--exact mirror:file]
//   node fetch-undraw.mjs --list <keyword>
//
// <query> 解析顺序：
//   1) 别名（next.js-saas-admin-starter 常用预设，见 ALIASES）：error-404 / error-401 / error-403 / error-500 / error-503 / empty
//   2) 精确名（可带 mirror: 前缀，可省 .svg）：balazser:fingerprint-login / lost_bqr2
//   3) 关键词：在两个镜像里子串（不区分大小写）匹配；命中多个则列出，用 --exact mirror:file 挑一个
//
// 例：
//   node fetch-undraw.mjs error-401 --component src/components/illustrations/error-401.tsx
//   node fetch-undraw.mjs fingerprint
//   node fetch-undraw.mjs --list server
// -----------------------------------------------------------------------------

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { recolorSvg } from "./undraw-recolor.mjs";

const ACCENT_DEFAULT = "#6c63ff";

// 两个 undraw 镜像。accents = 着色时转 currentColor 的主色集合（见 recolorSvg）。
const MIRRORS = [
  {
    id: "cuuupid",
    repo: "cuuupid/undraw-illustrations",
    branch: "master",
    dir: "svg",
    accents: ["#6c63ff"],
  },
  {
    id: "balazser",
    repo: "balazser/undraw-svg-collection",
    branch: "main",
    dir: "svgs",
    // balazser 主色是 var(--primary-svg-color)；人物用深灰族，一并转 currentColor 以便暗色主题下也清晰。
    accents: ["var(--primary-svg-color)", "#3f3d58", "#2f2e43", "#3f3d56", "#2f2e41"],
  },
];

const mirrorById = (id) => MIRRORS.find((m) => m.id === id);
const rawUrl = (m, file) =>
  `https://raw.githubusercontent.com/${m.repo}/${m.branch}/${m.dir}/${file}`;
const treeUrl = (m) => `https://api.github.com/repos/${m.repo}/git/trees/${m.branch}?recursive=1`;
const treeCache = (id) => resolve(tmpdir(), `undraw-tree-${id}.json`);
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 小时缓存镜像目录，避免反复拉取 + 触发限流
const GH_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "next.js-saas-admin-starter-fetch-undraw",
};

// next.js-saas-admin-starter 常用场景 → "mirror:file"。401 用 balazser 的 fingerprint-login（认证语义最准）。
const ALIASES = {
  "error-404": "cuuupid:lost_bqr2",
  "error-401": "balazser:fingerprint-login",
  "error-403": "cuuupid:secure_data_0rwp",
  "error-500": "cuuupid:server_status_5pbv",
  "error-503": "balazser:server-down",
  empty: "cuuupid:empty_xct9",
};

function parseArgs(argv) {
  const positional = [];
  const opts = {
    from: undefined,
    out: undefined,
    component: undefined,
    exact: null,
    list: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") opts.from = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--component")
      opts.component = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "";
    else if (a === "--exact") opts.exact = argv[++i];
    else if (a === "--list") opts.list = argv[++i] ?? "";
    else if (a === "-h" || a === "--help") opts.help = true;
    else positional.push(a);
  }
  return { positional, opts };
}

function help() {
  console.log(`用法: node fetch-undraw.mjs <query> [options]
       node fetch-undraw.mjs --list <keyword>

  <query>                 别名 / 精确名(可带 mirror: 前缀) / 关键词
  --from <color[,color]>  覆盖主色（默认用镜像自带；多个用逗号分隔）
  --out <path.svg>        输出着色后 SVG（默认 public/illustrations/<name>.svg）
  --component [path]      额外输出可直接 import 的内联 React 组件（currentColor，随主题）
                          不给路径则默认 src/components/illustrations/<name>.tsx
  --exact <mirror:file>   关键词命中多个时，用它精确指定
  --list <keyword>        只列出两镜像中匹配的文件名（mirror:file），不下载

镜像：${MIRRORS.map((m) => m.id).join(" / ")}
别名：${Object.keys(ALIASES).join(" / ")}
`);
}

async function getTree(m) {
  const cache = treeCache(m.id);
  try {
    if (existsSync(cache)) {
      const c = JSON.parse(readFileSync(cache, "utf8"));
      if (typeof c.ts === "number" && Date.now() - c.ts < CACHE_MS && Array.isArray(c.tree))
        return c.tree;
    }
  } catch {
    // 缓存损坏则忽略
  }
  const res = await fetch(treeUrl(m), { headers: GH_HEADERS });
  if (!res.ok) {
    throw new Error(
      `拉取 ${m.id} 镜像目录失败：HTTP ${res.status}（GitHub 未鉴权有频率限制，稍后重试）`,
    );
  }
  const data = await res.json();
  let files;
  if (data.truncated) {
    // 树被截断（极少）——退化为 contents 接口
    const r2 = await fetch(
      `https://api.github.com/repos/${m.repo}/contents/${m.dir}?ref=${m.branch}`,
      {
        headers: GH_HEADERS,
      },
    );
    const d2 = await r2.json();
    files = d2.filter((f) => f.name.endsWith(".svg")).map((f) => f.name);
  } else {
    const prefix = `${m.dir}/`;
    files = (data.tree || [])
      .filter((t) => t.path.startsWith(prefix) && t.path.endsWith(".svg"))
      .map((t) => t.path.slice(prefix.length));
  }
  writeFileSync(cache, JSON.stringify({ ts: Date.now(), tree: files }, null, 2), "utf8");
  return files;
}

/** 拉取全部镜像的文件列表，合并为 [{mirror, file}]；单个镜像失败不阻断另一个。 */
async function getAllTrees() {
  const results = await Promise.all(
    MIRRORS.map(async (m) => {
      try {
        return (await getTree(m)).map((file) => ({ mirror: m.id, file }));
      } catch (e) {
        console.error(`(跳过 ${m.id} 镜像：${e.message})`);
        return [];
      }
    }),
  );
  return results.flat();
}

/** 解析 "mirror:file" → {mirror, file}；无前缀则 mirror=null（跨镜像搜索）。 */
function parseRef(ref) {
  const idx = ref.indexOf(":");
  if (idx > 0 && mirrorById(ref.slice(0, idx))) {
    return { mirror: ref.slice(0, idx), file: ref.slice(idx + 1) };
  }
  return { mirror: null, file: ref };
}

const baseName = (file) => file.replace(/\.svg$/i, "");
const ensureSvg = (file) => (/\.svg$/i.test(file) ? file : `${file}.svg`);

async function resolveFile(query, opts) {
  // 1) 别名
  if (ALIASES[query]) {
    const r = parseRef(ALIASES[query]);
    return { mirror: r.mirror, file: ensureSvg(r.file) };
  }
  // 1b) 显式 mirror:file 引用 → 直接解析，免拉目录树（命中 GitHub 限流也能用；文件不存在时 raw 请求会 404）
  const ref = parseRef(opts.exact ?? query);
  if (ref.mirror) return { mirror: ref.mirror, file: ensureSvg(ref.file) };

  const all = await getAllTrees();
  // 2) 精确（--exact 或 query 本身是精确名）
  const exact = all.find(
    (e) =>
      (ref.mirror ? e.mirror === ref.mirror : true) &&
      (baseName(e.file) === baseName(ref.file) || e.file === ref.file),
  );
  if (opts.exact) {
    if (exact) return exact;
    throw new Error(`--exact "${opts.exact}" 未找到`);
  }
  if (exact) return exact;
  // 3) 关键词
  const matches = all.filter((e) => e.file.toLowerCase().includes(query.toLowerCase()));
  if (matches.length === 0) throw new Error(`未匹配到包含 "${query}" 的插画。用 --list 浏览。`);
  if (matches.length > 1) {
    console.error(
      `"${query}" 命中 ${matches.length} 个，请用 --exact <mirror:file> 指定其一：\n` +
        matches.map((m) => `  ${m.mirror}:${m.file}`).join("\n"),
    );
    process.exit(1);
  }
  return matches[0];
}

function pascalCase(s) {
  return s
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^./, (c) => c.toUpperCase()))
    .join("");
}

/** 生成内联 React 组件源码：SVG 以字符串内联（dangerouslySetInnerHTML），currentColor 随外层 className。 */
function toComponentSource(svgMarkup, compPath) {
  const name = pascalCase(basename(compPath, ".tsx")) + "Illustration";
  return `// 由 fetch-undraw.mjs 自动生成（来源 undraw.co 镜像）。
// 主色 → currentColor：外层 className 驱动尺寸与文字色，随品牌/亮暗主题自动切换。
// <img> 不支持 currentColor，故以 dangerouslySetInnerHTML 内联；语义由页面 h1/描述承载，故 aria-hidden。
import { cn } from "@/lib/utils";

const svgMarkup = ${JSON.stringify(svgMarkup)};

export function ${name}({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex [&_svg]:h-auto [&_svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
`;
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));

  if (opts.help) {
    help();
    process.exit(0);
  }

  if (opts.list !== null) {
    const all = await getAllTrees();
    const kw = opts.list.toLowerCase();
    const matches = all.filter((e) => e.file.toLowerCase().includes(kw));
    console.log(
      matches.length
        ? matches.map((m) => `${m.mirror}:${m.file}`).join("\n")
        : `(无匹配 "${opts.list}")`,
    );
    console.log(`\n共 ${matches.length} 张`);
    process.exit(0);
  }

  const query = positional[0];
  if (!query) {
    help();
    process.exit(1);
  }

  const { mirror: mirrorId, file } = await resolveFile(query, opts);
  const m = mirrorById(mirrorId);
  if (!m) throw new Error(`未知镜像：${mirrorId}`);
  console.log(`镜像文件: ${mirrorId}:${file}`);

  const res = await fetch(rawUrl(m, file));
  if (!res.ok)
    throw new Error(`下载失败：HTTP ${res.status} ${res.statusText}（${rawUrl(m, file)}）`);
  const source = await res.text();

  // 着色：--from 覆盖（逗号分隔多个），否则用镜像自带主色集合
  const accents = opts.from
    ? opts.from
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : m.accents;
  const { svg: themed, hit } = recolorSvg(source, accents);
  if (!hit) {
    console.warn(
      `⚠ 未命中任何主色 [${accents.join(", ")}]，插画可能不随主题变色。用 --from 指定该插画的主色。`,
    );
  }

  // 1) 着色 SVG
  const outPath = resolve(opts.out ?? `public/illustrations/${baseName(file)}.svg`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, themed, "utf8");
  console.log(`✓ 着色 SVG → ${outPath}`);

  // 2) 内联组件（可选）
  if (opts.component !== undefined) {
    const compPath = opts.component
      ? resolve(opts.component)
      : resolve("src/components/illustrations", baseName(file) + ".tsx");
    mkdirSync(dirname(compPath), { recursive: true });
    writeFileSync(compPath, toComponentSource(themed, compPath), "utf8");
    const name = pascalCase(basename(compPath, ".tsx")) + "Illustration";
    console.log(`✓ 组件 → ${compPath}（<${name} className="w-64 text-primary" />）`);
  }

  console.log(`\n提示：颜色与尺寸全靠外层 className，如 className="w-64 text-primary"。`);
}

main().catch((err) => {
  console.error(`✗ ${err.message || err}`);
  process.exit(1);
});
