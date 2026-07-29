# 个人博客

基于 [Astro](https://astro.build) 构建的个人博客，部署于 `https://baimeixiaofan.xyz`。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

部署到阿里云 ECS(`47.109.191.13`)，通过 git push 触发自动同步。

### 推送代码后自动部署

服务器每 15 分钟从 GitHub 拉取代码、同步飞书文档、构建并部署：

```bash
git add -A
git commit -m "xxx"
git push
# 等待 ≤ 15 分钟，或手动登录服务器跑:
# ssh root@47.109.191.13 /opt/blog/scripts/server-sync.sh
```

### 飞书知识库同步

- 自动发现所有可访问的飞书 Wiki 空间
- 排除 `FEISHU_EXCLUDE_TITLES` 中配置的页面（如 `首页,english-word`）
- 拉取的文档以 `feishu-{space_slug}-{title_slug}.md` 格式保存

SSH 配置：`ssh root@47.109.191.13`

## 服务器

- Ubuntu 26.04, nginx 1.28, certbot
- 站点目录：`/var/www/baimeixiaofan/`
- nginx 配置：`/etc/nginx/sites-available/baimeixiaofan`
- HTTPS：Let's Encrypt（`certbot.timer` 自动续期）
