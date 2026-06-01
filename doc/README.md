# Pikachu Music 项目文档

## 项目概述

Pikachu Music 是一个基于 Vue 3 + TypeScript + Pinia 的音乐播放器应用，支持多音源搜索、播放、收藏等功能。

## 项目结构

```
src/
├── api/            # 音乐平台 API 封装 (netease, qq, migu, kuwo)
├── assets/icons/   # SVG 图标
├── components/     # 通用组件
│   ├── ui/         # UI 组件 (GlassCard, GlassButton, etc.)
│   └── ...         # 业务组件 (TrackItem, LyricScroller, etc.)
├── composables/    # 组合式函数 (useTheme, useColorExtract)
├── layout/         # 应用布局 (AppLayout, routes)
├── pages/          # 页面组件
├── router/         # 路由配置
├── stores/         # Pinia 状态管理
├── styles/         # 全局样式
├── types/          # TypeScript 类型定义
└── utils/          # 工具函数 (color, db, format, lyric, request)
```

## 核心功能

### 1. 多音源搜索

支持多个音乐平台搜索：
- 网易云音乐 (netease)
- QQ 音乐 (qq)
- 酷狗音乐 (kugou)
- 酷我音乐 (kuwo)
- 咪咕音乐 (migu)

### 2. 播放器功能

- 播放/暂停/上一首/下一首
- 播放模式：顺序播放、单曲循环、随机播放
- 进度条控制
- 音量控制
- 歌词显示
- 预加载系统

### 3. 主题系统

支持三种主题模式：
- **dark**: 深色主题
- **light**: 浅色主题
- **dominant**: 沉浸式主题（根据歌曲封面主色动态调整）

### 4. 缓存系统

使用 IndexedDB 缓存：
- 播放历史（2小时过期）
- 歌曲详情缓存（2小时过期）
- 推荐缓存（30分钟过期）
- 搜索历史（7天过期）

## 核心文件说明

### 状态管理

#### `src/stores/player.ts`

播放器核心状态管理，包含：
- 当前播放歌曲
- 播放队列
- 播放状态（播放/暂停/进度）
- 播放模式
- 预加载系统
- 主导色同步

关键函数：
- `playTrack()`: 播放指定歌曲
- `playNext()`: 播放下一首
- `togglePlayPause()`: 切换播放/暂停
- `prefetchAhead()`: 预加载后续歌曲

#### `src/stores/playlist.ts`

歌单和收藏管理：
- 收藏列表
- 播放历史
- 自定义歌单

#### `src/stores/appConfig.ts`

应用配置：
- 主题设置
- 搜索配置
- 预加载配置

### 组合式函数

#### `src/composables/useTheme.ts`

主题管理：
- 深浅色切换
- 沉浸式模式
- CSS 变量管理

#### `src/composables/useColorExtract.ts`

颜色提取：
- 从封面图片提取主色
- 颜色缓存
- CORS 处理

### 工具函数

#### `src/utils/db.ts`

IndexedDB 操作：
- 歌曲缓存
- 播放历史
- 推荐缓存
- 缓存统计

#### `src/utils/color.ts`

颜色处理：
- 主导色计算
- 衍生变量生成
- 亮度/饱和度调整

## 页面说明

### 首页 (HomePage.vue)

功能：
- 瀑布流推荐歌曲
- 封面区展示当前播放歌曲
- 播放/暂停控制
- 刷新推荐列表
- 时间显示

实现要点：
- 使用双列瀑布流布局
- 图片懒加载
- 预加载颜色提取
- 缓存推荐列表

### 播放页 (PlayPage.vue)

功能：
- 歌曲封面展示
- 歌词滚动
- 播放控制
- 进度条
- 音量控制

实现要点：
- 沉浸式背景
- 歌词同步
- 手势控制

### 搜索页 (SearchPage.vue)

功能：
- 多音源搜索
- 搜索结果展示
- 搜索历史

### 我的页面 (MinePage.vue)

功能：
- 收藏列表
- 播放历史
- 自定义歌单
- 主题设置

### 缓存管理页 (CacheManagePage.vue)

功能：
- 查看缓存统计
- 清除指定缓存
- 清除全部缓存

## 样式系统

### CSS 变量

核心变量：
- `--bg-base`: 背景色
- `--text-primary`: 主要文字颜色
- `--text-secondary`: 次要文字颜色
- `--dominant-color`: 主导色
- `--surface-1/2/3`: 表面色

### 主题切换

通过 `data-theme` 属性控制：
- `data-theme="light"`: 浅色主题
- 无属性: 深色主题
- `data-immersive`: 沉浸式模式

### 组件库

UI 组件：
- `GlassCard`: 毛玻璃卡片
- `GlassButton`: 毛玻璃按钮
- `GlassPopup`: 毛玻璃弹窗
- `SectionHeader`: 区块标题
- `EmptyState`: 空状态
- `SkeletonRow`: 骨架屏

## 开发指南

### 添加新页面

1. 在 `src/pages/` 创建 Vue 组件
2. 在 `src/router/index.ts` 添加路由
3. 使用 CSS 变量确保主题兼容

### 添加新音源

1. 在 `src/api/` 创建 API 封装
2. 在 `src/stores/search.ts` 注册音源
3. 实现搜索和详情获取接口

### 主题适配

使用 CSS 变量而非硬编码颜色：
```css
/* 推荐 */
color: var(--text-primary);
background: var(--bg-base);

/* 避免 */
color: #ffffff;
background: #000000;
```

## 已知问题和优化方向

### 性能优化

1. 瀑布流虚拟滚动
2. 图片懒加载优化
3. 预加载策略调整

### 功能扩展

1. Web Audio API 频谱分析
2. 歌词编辑功能
3. 社交分享功能

## 更新日志

### 2026-06-01

1. 修复瀑布流图片加载问题
2. 优化播放/暂停按钮动画
3. 改进歌曲切换错误处理
4. 优化首页数据加载逻辑
5. 修复缓存管理页面样式
6. 添加音符动画效果
