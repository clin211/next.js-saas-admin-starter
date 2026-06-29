# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> 本仓库的完整协作规范（项目概述、技术栈、命令、架构、约定、注意点）已沉淀在 `AGENTS.md`，上方 `@AGENTS.md` 会将其完整引入。请勿在此重复维护——改动统一在 `AGENTS.md` 进行。本文件仅保留 Claude Code 专属说明。

## Claude Code 专属说明

- **提交代码**：当用户表达提交意图（"提交"、"commit" 等），优先使用 `/commit` skill——它会基于暂存区生成符合 Conventional Commits 的提交并执行（项目已配 commitlint，类型须为 `feat/fix/docs/chore/refactor/...`）。
- **先验证再下结论**：本项目处于脚手架阶段、含大量桩与 TODO，且文档与实现偶有出入（见 `AGENTS.md` 重要注意点）。改动后用 `bun run typecheck` / `bun run lint` 验证，不要假设有效。
