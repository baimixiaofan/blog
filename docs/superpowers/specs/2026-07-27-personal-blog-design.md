# Personal Blog Design (个人博客设计稿)

**Date**: 2026-07-27
**Author**: 范升耀 (Fan Shengyao)
**Status**: Draft v1.1
**Target deploy**: 阿里云 ECS `47.109.191.13`,域名 `baimeixiaofan.xyz`

## Goal

为范升耀搭建个人展示型静态博客,部署到已有的阿里云 ECS,展示:
- 个人简介 / 简历
- 机器人研究项目 (跳跃机器人)
- xbotpark 训练营经历
- web 产品作品
- 飞书云文档博客 (通过外链列表)
- 友链

## Tech Stack

- **静态站点生成器**: Astro
- **样式**: 原生 CSS / CSS Modules (不引入 Tailwind,保持极简)
- **内容**: Astro Content Collections (Markdown/MDX)
- **部署**: 本地构建 → rsync 到服务器
- **服务器**: Nginx + certbot (Let's Encrypt HTTPS)

## Repository Structure (本地 D:\blog)

```
D:\blog\
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── public/
│   ├── images/
│   │   ├── avatar.jpg           # 【用户自填】个人照片
│   │   ├── milk-dragon.png      # 【用户自填】奶龙背景图
│   │   └── projects/            # 项目配图
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── index.astro          # 首页 (名字/照片/tagline/链接)
│   │   ├── about.astro          # 关于 (简历内容)
│   │   ├── projects/
│   │   │   ├── index.astro      # 项目列表
│   │   │   ├── jumping-robot.astro
│   │   │   ├── xbotpark.astro
│   │   │   └── web-showcase.astro
│   │   ├── blog/
│   │   │   └── index.astro      # 飞书文档列表
│   │   ├── links.astro          # 友链
│   │   └── 404.astro
│   ├── content/
│   │   ├── config.ts            # Content Collections schema
│   │   ├── projects/            # 项目 Markdown
│   │   └── blog/                # 飞书链接 (frontmatter)
│   ├── components/
│   │   ├── Layout.astro
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── MilkDragonBg.astro   # 奶龙全局水印
│   │   ├── Avatar.astro         # 头像组件 (含 fallback)
│   │   └── ProjectCard.astro
│   └── styles/
│       └── global.css
├── scripts/
│   └── deploy.sh                # rsync 部署脚本
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-07-27-personal-blog-design.md  # 本文件
```

## Page Details

### `/` Home
- 居中布局:头像 + 名字"范升耀" + 一句话 tagline + 社交链接 (GitHub / 邮箱 / 飞书)
- 奶龙水印全屏背景
- 照片缺失时显示首字母占位 (字母"F")

### `/about` 关于
- 从主简历 docx 提取
- 模块:基本信息 / 教育背景 / 技能栈 / 实习/项目经历
- 顶部展示头像

### `/projects` 项目列表
- 卡片网格,每张卡片:封面图 + 标题 + 简介 + 链接

### `/projects/jumping-robot` 跳跃机器人
- 来源:`D:\个人简历\自然科学\` (STEP/3MF/PDF)
- 挑 1-2 个亮点项目:腿式跳跃机器人
- 配论文引用 (icac068.pdf, Ribak_2013 仿生跳跃)
- 配 STEP/3MF 文件预览或截图

### `/projects/xbotpark` 训练营
- 来源:`D:\个人简历\阿里云训练营\范升耀-阿里训练营运营.docx`
- 训练营时间、角色、产出

### `/projects/web-showcase` web 产品
- 来源:`D:\个人简历\web产品\` (4 张 png 截图)
- 卡片展示,点击看大图

### `/blog` 博客
- 飞书云文档文章列表
- 卡片形式:封面图 + 标题 + 简介 + 跳转飞书外链
- 数据存为 Markdown frontmatter,便于维护
- 初始为空,占位提示

### `/links` 友链
- 自己的 GitHub: https://github.com/baimixiaofan
- 预留友链表 (空)

## Visual Design

- **风格**: 极简技术风
- **字体**: Inter (英文) + 思源黑体 (中文),通过 CDN 引入
- **配色**: 黑白灰 + 单一强调色 (奶龙色系,待定)
- **暗色模式**: 默认开,可切换
- **奶龙水印**: `position: fixed; right/bottom; opacity: 0.1; z-index: -1; pointer-events: none;`
- **布局**: `max-width: 720px` 居中,大量留白

## Photo Placeholder (重要)

**位置**: `public/images/avatar.jpg`
**引用**:
- 首页 `/` (`src/pages/index.astro`)
- 关于页 `/about` (`src/pages/about.astro`)

**实现细节**:
- 通过 `<Avatar />` 组件统一管理
- 组件检测文件是否存在,不存在时显示首字母"F"圆圈占位
- 控制台提示用户添加照片

## Deployment

### 本地命令
```bash
npm install
npm run dev       # 本地预览 http://localhost:4321
npm run build     # 生成 dist/
npm run deploy    # rsync dist/ → server:/var/www/baimeixiaofan/
```

### 服务器 (47.109.191.13)
- 系统: 待确认 (估计 CentOS / Ubuntu)
- 站点根目录: `/var/www/baimeixiaofan/`
- Nginx 配置: 监听 80/443,serve 静态文件,反向代理 fallback
- HTTPS: certbot 申请 Let's Encrypt 证书
- 域名 DNS: `baimeixiaofan.xyz` A 记录 → `47.109.191.13`

### 部署脚本
```bash
# scripts/deploy.sh
rsync -avz --delete dist/ user@47.109.191.13:/var/www/baimeixiaofan/
```

## Security Hardening (实施时一并处理)

- **强警告**: 用户提供的密码 `Abc123456` 弱,且为明文传输,**必须修改**
- 改 SSH 密钥登录 (生成密钥对,把公钥传到服务器)
- 改 SSH 端口 (非 22)
- 禁用密码登录 (`PasswordAuthentication no`)
- (可选) 装 fail2ban 防爆破
- 服务器首次配置时执行

## Content Source Mapping (待办)

| 页面 | 数据源 | 状态 |
|---|---|---|
| About | `D:\个人简历\范升耀_算法实习生_v3.docx` | 待提取 |
| Jumping Robot | `D:\个人简历\自然科学\` | 待挑选项目 |
| xbotpark | `D:\个人简历\阿里云训练营\范升耀-阿里训练营运营.docx` | 待提取 |
| Web Showcase | `D:\个人简历\web产品\` (4 png) | 就绪 |
| Blog | 飞书文档 | 待用户添加 |
| Avatar | 用户自填 | **用户待上传** |
| 奶龙背景图 | 用户自填 | **用户待上传** |

## Phases (实施计划大纲)

1. **Phase 1: 本地 Astro 脚手架** - `npm create astro@latest`,装依赖,基础配置
2. **Phase 2: 内容提取** - 读 docx,整理出 about/projects 文案
3. **Phase 3: 页面构建** - 7 个页面 + 奶龙水印 + 头像占位
4. **Phase 4: 服务器准备** - SSH 上服务器,装 Nginx,建站点目录
5. **Phase 5: 部署上线** - 配置 DNS,certbot 申请证书,首次部署
6. **Phase 6: 安全加固** - SSH 密钥、换端口、禁密码

## Out of Scope (YAGNI)

- 评论系统 (Giscus 等) — 后续需要再加
- 访问统计 — 后续再加 (百度统计 / Umami)
- 在线管理后台 — YAGNI
- 站内搜索 — YAGNI (内容少,先不加)
- 订阅 / Newsletter — YAGNI
- 国际化 (中英双语) — 单中文即可

## Open Questions

无。脑暴阶段所有关键问题已澄清:
- 技术栈: Astro
- 风格: 极简技术风 + 奶龙水印
- 内容板块: Home/About/Projects/Blog/Links
- 飞书接入: 列表 + 外链
- 域名: baimeixiaofan.xyz (用户已有)
- 服务器: 47.109.191.13 (用户已有)
- 照片: 用户自填,留占位
