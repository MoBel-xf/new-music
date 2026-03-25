---
name: pikachu-vue-dev
description: '用于 Pikachu Music 项目（Vue 3 + TS + Vant + Pinia）的通用开发规范与代码审查工作流。适用于：创建新的 Vue 组件、新增页面/函数、以及通用代码审查。强制要求考虑复用性与可维护性。'
---

# Pikachu Music Vue 开发工作流

当你在该项目中创建新页面、组件，或是进行代码审查时，请严格遵循以下工作流：

## 1. 结构分析 (Analyze Structure)

- **目录规范**：如果是通用组件，必须放置在 `src/components/` 目录下；独立页面放置在 `src/pages/`；可复用的 hooks 放在 `src/composables/`；通用工具函数放在 `src/utils/`。
- **设计考量**：在编写代码前，先分析需求职责。评估组件的参数（Props）和事件（Emits），务必保证组件的高复用性和可维护性。

## 2. 编写 TS/Vue 代码 (Write Code)

- **技术栈约束**：强制使用 **Vue 3 `<script setup lang="ts">`** 和 **TypeScript**，禁用 Options API。
- **UI 组件库**：优先使用项目中已集成的 **Vant** 组件库来构建 UI，确保整体风格一致。
- **样式规范**：优先使用 `src/styles/` 目录下的变量和全局样式，不要写死颜色值和字号。

## 3. 状态管理检查 (Check Pinia)

- **数据流**：在使用本地的 `ref`/`reactive` 前，检查是否应使用现有的 Pinia stores（如 `player.ts`, `playlist.ts`, `search.ts`）。
- **职责分离**：全局跨页面共享的状态（正在播放的歌曲、播放列表、搜索历史等）必须通过 Pinia 统一管理，组件内部仅保留纯粹的视图交互状态。

## 4. 审查与总结 (Code Review)

- 检查代码中是否添加了清晰易懂的 **中文注释**（遵循用户偏好）。
- 验证 TypeScript 类型是否完备。
- 确保代码精简，不要过度设计，满足高内聚低耦合的原则。
