# 🎵 APP Music

Vue 3 + TypeScript + Pinia + Vant 4 移动端音乐播放器。

## 技术栈

| 分类 | 技术                   |
| ---- | ---------------------- |
| 框架 | Vue 3.4 + TypeScript 5 |
| 状态 | Pinia 2                |
| UI   | Vant 4                 |
| 构建 | Vite 5                 |
| 路由 | Vue Router 4           |
| 工具 | VueUse / idb / Axios   |

## 快速开始

```bash
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env.development`，按需填写：

```bash
cp .env.example .env.development
```

| 变量                    | 说明                     | 必填 |
| ----------------------- | ------------------------ | ---- |
| `VITE_MIGU_API_BASE`    | 咪咕 API 地址            | ✅   |
| `VITE_NETEASE_API_BASE` | 网易云 API 地址          | ✅   |
| `VITE_LRC_PROXY_BASE`   | 歌词跨域代理             | ❌   |
| `VITE_QQ_API_BASE`      | QQ音乐 API（留空不启用） | ❌   |
| `VITE_QQ_API_KEY`       | QQ音乐 API Key           | ❌   |
| `VITE_KUWO_API_BASE`    | 酷我 API（留空不启用）   | ❌   |

## 项目结构

```
src/
├── api/          # 各平台 API 封装（migu/netease/qq/kuwo）
├── components/   # 公共组件（PlayerBar/TrackItem/LyricScroller 等）
├── composables/  # 组合式函数（useColorExtract）
├── pages/        # 路由页面
├── stores/       # Pinia 状态（player/search/playlist）
├── types/        # TypeScript 类型定义
├── utils/        # 工具函数（request/db/lyric/format）
└── router/       # 路由配置
```

## 功能说明

- **首页**：榜单入口、热门关键词、猜你喜欢
- **搜索页**：多平台并发搜索、无限滚动、平台/数量筛选
- **播放详情页**：封面动态主色背景、歌词逐行高亮、手势切歌
- **我的页面**：收藏、播放历史、自建歌单
- **离线缓存**：IndexedDB 存储收藏/歌单/历史/曲目详情（LRU 500条）

## 平台扩展

在 `.env` 中配置 QQ音乐或酷我的 API 地址即可自动启用对应平台，无需修改代码。

## 声明

本项目仅供学习交流，音乐版权归各平台与原作者所有。
