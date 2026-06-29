import type { SortingState } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import { DEFAULT_PAGE_SIZE, parseSortParam, parseTableParams, stringifySortParam } from "./params";

describe("parseSortParam / stringifySortParam —— 往返对称", () => {
  it("空串 / undefined → []", () => {
    expect(parseSortParam("")).toEqual([]);
    expect(parseSortParam(undefined)).toEqual([]);
  });

  it('"name.desc" → [{ id: "name", desc: true }]', () => {
    expect(parseSortParam("name.desc")).toEqual([{ id: "name", desc: true }]);
  });

  it('"name.asc" → [{ id: "name", desc: false }]', () => {
    expect(parseSortParam("name.asc")).toEqual([{ id: "name", desc: false }]);
  });

  it("多列逗号分隔 → 多元素数组（顺序保留）", () => {
    expect(parseSortParam("name.desc,createdAt.asc")).toEqual([
      { id: "name", desc: true },
      { id: "createdAt", desc: false },
    ]);
  });

  it("畸形片段被过滤（空 id / 缺方向）", () => {
    // 注意：noUncheckedIndexedAccess 下 split 结果可能为 undefined，仅保留有 id 的片段
    expect(parseSortParam(".desc")).toEqual([]);
    expect(parseSortParam(",,")).toEqual([]);
    expect(parseSortParam("name")).toEqual([{ id: "name", desc: false }]); // 无方向视为 asc
    expect(parseSortParam("name.desc,,createdAt.asc")).toEqual([
      { id: "name", desc: true },
      { id: "createdAt", desc: false },
    ]);
  });

  it("stringifySortParam([]) → 空串", () => {
    expect(stringifySortParam([])).toBe("");
  });

  it("单列 → 'id.desc' / 'id.asc'", () => {
    expect(stringifySortParam([{ id: "name", desc: true }])).toBe("name.desc");
    expect(stringifySortParam([{ id: "name", desc: false }])).toBe("name.asc");
  });

  it("多列 → 逗号拼接", () => {
    const state: SortingState = [
      { id: "name", desc: true },
      { id: "createdAt", desc: false },
    ];
    expect(stringifySortParam(state)).toBe("name.desc,createdAt.asc");
  });

  it("往返对称：parse ∘ stringify = identity", () => {
    const cases: SortingState[] = [
      [],
      [{ id: "name", desc: true }],
      [
        { id: "a", desc: false },
        { id: "b", desc: true },
      ],
    ];
    for (const state of cases) {
      expect(parseSortParam(stringifySortParam(state))).toEqual(state);
    }
  });
});

describe("parseTableParams —— 钳位与缺省", () => {
  it("page < 1 → 1", () => {
    const r = parseTableParams({ page: "0" });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("page 为负数 → 1", () => {
    expect(parseTableParams({ page: "-5" }).page).toBe(1);
  });

  it("page 非数字 → 落回 1（fallback）", () => {
    expect(parseTableParams({ page: "abc" }).page).toBe(1);
  });

  it("pageSize 超上限 100 → 钳到 100", () => {
    expect(parseTableParams({ pageSize: "999" }).pageSize).toBe(100);
  });

  it("pageSize < 1 → 钳到 1", () => {
    expect(parseTableParams({ pageSize: "0" }).pageSize).toBe(1);
  });

  it("pageSize 缺省 → DEFAULT_PAGE_SIZE", () => {
    expect(parseTableParams({}).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it("pageSize 为合法值 → 保留（向 0 取整）", () => {
    expect(parseTableParams({ pageSize: "20" }).pageSize).toBe(20);
    // 非整数 → 向下取整
    expect(parseTableParams({ pageSize: "20.9" }).pageSize).toBe(20);
  });

  it("数组型参数取首项", () => {
    const r = parseTableParams({
      page: ["2", "3"],
      pageSize: ["50", "20"],
      q: ["foo", "bar"],
      sort: ["name.desc", "x.asc"],
    });
    expect(r.page).toBe(2);
    expect(r.pageSize).toBe(50);
    expect(r.search).toBe("foo");
    expect(r.sort).toBe("name.desc");
    expect(r.sortingState).toEqual([{ id: "name", desc: true }]);
  });

  it("search / sort 缺省 → 空串", () => {
    const r = parseTableParams({});
    expect(r.search).toBe("");
    expect(r.sort).toBe("");
    expect(r.sortingState).toEqual([]);
  });

  it("整体往返：sort 通过 sortingState 解析", () => {
    const r = parseTableParams({ sort: "name.desc,createdAt.asc" });
    expect(r.sortingState).toEqual([
      { id: "name", desc: true },
      { id: "createdAt", desc: false },
    ]);
  });
});
