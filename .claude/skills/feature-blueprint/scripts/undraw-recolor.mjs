#!/usr/bin/env node
// undraw-recolor.mjs
// -----------------------------------------------------------------------------
// 把 undraw 插画里的某个主色替换成 currentColor，使其能跟随主题（亮/暗）。
//
// 两种用法：
//   1) CLI：node undraw-recolor.mjs <input.svg> [--from #6c63ff] [--out output.svg]
//   2) 模块：import { recolorSvg } from "./undraw-recolor.mjs" —— 供 fetch-undraw.mjs 复用（DRY）。
//
// 为什么是 currentColor：见 feature-blueprint SKILL.md 第 4 步。currentColor 取继承自外层的文字色，
// 于是外层 className="text-primary" 会自动用品牌色、切暗色主题也跟着变。
// 注意：<img src="x.svg"> 不支持 currentColor，必须把 SVG 内联进组件（见 fetch-undraw.mjs 的 --component）。
// -----------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename, extname, dirname } from "node:path";
import { pathToFileURL } from "node:url";

/** 把 #rgb / #rrggbb 规范化成小写 #rrggbb；非法则抛错。 */
export function normalizeHex(c) {
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((c || "").trim());
  if (!m) throw new Error(`无法识别的颜色: ${c}（只支持 #rgb / #rrggbb）`);
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  return `#${h.toLowerCase()}`;
}

/**
 * 把 svg 中给定主色（可多个）全部替换为 currentColor；去掉根 <svg> 的 width/height
 * （尺寸交由 CSS 控制）；若缺 role 则补 role="img"。返回 { svg, hit }。
 *
 * from 支持单个值或数组；每个值可以是 hex（#rgb/#rrggbb，按大小写两种写法都替换），
 * 也可以是任意字面量（如 balazser 镜像的 `var(--primary-svg-color)`），按原样替换。
 * 多色场景：不同 undraw 镜像主色写法不一（cuuupid 用 #6c63ff；balazser 用 var() + 深灰族），
 * 把「主色 + 深中性色」一起转 currentColor，才能在暗色主题下也清晰、跟随品牌。
 */
export function recolorSvg(svg, from) {
  const tokens = Array.isArray(from) ? from : [from];
  let out = svg;
  let hit = false;
  for (const token of tokens) {
    const t = String(token ?? "").trim();
    if (!t) continue;
    const isHex = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t);
    const variants = isHex
      ? (() => {
          const h = normalizeHex(t);
          return [h, h.toUpperCase()];
        })()
      : [t];
    for (const v of variants) {
      const before = out;
      out = out.split(v).join("currentColor");
      if (out !== before) hit = true;
    }
  }
  // 去掉根 <svg> 的 width/height，保留 viewBox，让尺寸由外层 CSS 控制
  out = out.replace(/<svg\b([^>]*)>/, (_match, attrs) => {
    const stripped = attrs
      .replace(/\s+width=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\s+height=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    return `<svg${stripped}>`;
  });
  // 无障碍：若缺 role 提示（不覆盖已有）
  if (!/\brole=/i.test(out)) {
    out = out.replace(/<svg\b/, '<svg role="img"');
  }
  return { svg: out, hit };
}

// —— CLI（仅当直接运行本文件时执行；被 import 时不跑）——
const isMain = import.meta.url === pathToFileURL(process.argv[1] || "").href;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(`用法: node undraw-recolor.mjs <input.svg> [--from #6c63ff] [--out output.svg]

  <input.svg>      undraw 下载的 SVG
  --from <color>   要替换的主色（默认 #6c63ff，undraw 默认品牌色）。支持 #rgb / #rrggbb
  --out <path>     输出路径（默认在输入旁加 .themed.svg）`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const input = resolve(args[0]);
  const fromIdx = args.indexOf("--from");
  const outIdx = args.indexOf("--out");
  const fromRaw = fromIdx !== -1 ? args[fromIdx + 1] : "#6c63ff";
  const outRaw = outIdx !== -1 ? args[outIdx + 1] : undefined;

  let result;
  try {
    const source = readFileSync(input, "utf8");
    result = recolorSvg(source, fromRaw);
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }

  const outPath = outRaw
    ? resolve(outRaw)
    : resolve(dirname(input), basename(input, extname(input)) + ".themed" + extname(input));
  writeFileSync(outPath, result.svg, "utf8");

  console.log(`输入: ${input}`);
  console.log(`主色 → currentColor（${result.hit ? "命中" : "未命中，请确认 --from 颜色"}）`);
  console.log(`输出: ${outPath}`);
  console.log(
    `\n用法：把 SVG 内联进组件，外层用 className="size-40 text-primary"（或 text-muted-foreground）驱动颜色。`,
  );
}
