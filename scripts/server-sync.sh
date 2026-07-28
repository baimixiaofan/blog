#!/usr/bin/env bash
# 飞书自动同步 + 部署脚本
# 由 cron 每分钟调用

set -e

BLOG_DIR=/opt/blog
WEB_DIR=/var/www/baimeixiaofan
LOG=/var/log/blog-sync.log

cd "$BLOG_DIR"

# 1. 尝试拉最新代码(连不上 GitHub 就继续,不影响同步)
if git fetch origin --depth 1 >> "$LOG" 2>&1; then
  git reset --hard origin/main
else
  echo "$(date -Iseconds) git fetch failed, using current code" >> "$LOG"
fi

# 2. 安装可能变化的依赖 (只安装必要的)
npm install --no-audit --no-fund >> "$LOG" 2>&1

# 3. 同步飞书
if ! npm run sync:feishu >> "$LOG" 2>&1; then
  echo "$(date -Iseconds) feishu sync failed" >> "$LOG"
  exit 1
fi

# 4. 构建
npm run build >> "$LOG" 2>&1 || {
  echo "$(date -Iseconds) build failed" >> "$LOG"
  exit 1
}

# 5. 部署到 nginx (清理旧文件,保留 .well-known 给 certbot)
find "$WEB_DIR" -mindepth 1 ! -path "$WEB_DIR/.well-known*" -delete
cp -r dist/. "$WEB_DIR/"

echo "$(date -Iseconds) ok" >> "$LOG"
