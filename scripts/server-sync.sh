#!/usr/bin/env bash
# 飞书自动同步 + 部署脚本
# 每分钟由 cron 调用,但有锁避免重叠
set -e

BLOG_DIR=/opt/blog
WEB_DIR=/var/www/baimeixiaofan
LOG=/var/log/blog-sync.log
LOCK=/tmp/blog-sync.lock

# 抢占锁,失败说明上一个还在跑,直接退出不等待
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Iseconds) 上一次同步还在运行,跳过" >> "$LOG"
  exit 0
fi

cd "$BLOG_DIR"

# 1. 尝试拉最新代码(git 卡超过 60s 就跳过)
echo "$(date -Iseconds) 开始同步" >> "$LOG"
if timeout 60 git fetch --depth 1 >> "$LOG" 2>&1; then
  git reset --hard origin/main
else
  echo "$(date -Iseconds) git fetch 失败或超时,用当前代码继续" >> "$LOG"
fi

# 2. npm install (只安装必要的,失败也继续)
npm install --no-audit --no-fund >> "$LOG" 2>&1 || true

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
