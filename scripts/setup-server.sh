#!/usr/bin/env bash
# 服务器完整初始化脚本
# 用法: bash scripts/setup-server.sh
# 要求: 已 SSH 到服务器(默认端口 22)
set -e

echo "=== 1. 安装系统依赖 ==="
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl git rsync nginx certbot python3-certbot-nginx

echo "=== 2. 安装 Node.js 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
echo "node $(node -v) npm $(npm -v)"

echo "=== 3. 克隆仓库 ==="
rm -rf /opt/blog
git clone https://github.com/baimixiaofan/blog.git /opt/blog
cd /opt/blog
npm install --no-audit --no-fund

echo "=== 4. 创建 .env(需要手动填入飞书 App 信息) ==="
cat > /opt/blog/.env << 'ENVEOF'
# 把下面的 xxx 替换为实际值
FEISHU_APP_ID=xxx
FEISHU_APP_SECRET=xxx
FEISHU_WIKI_URL=
FEISHU_EXCLUDE_TITLES=首页,english-word
FEISHU_DOC_URLS=
ENVEOF
read -p "输入 App ID: " aid
read -sp "输入 App Secret: " asec
echo ""
sed -i "s/FEISHU_APP_ID=xxx/FEISHU_APP_ID=$aid/" /opt/blog/.env
sed -i "s/FEISHU_APP_SECRET=xxx/FEISHU_APP_SECRET=$asec/" /opt/blog/.env
echo ".env 已配置"

echo "=== 5. 配置 nginx ==="
cat > /etc/nginx/sites-enabled/baimeixiaofan << 'NGINXEOF'
server {
    server_name baimeixiaofan.xyz www.baimeixiaofan.xyz;
    root /var/www/baimeixiaofan;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }
}
NGINXEOF
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/baimeixiaofan

echo "=== 6. 请求 SSL 证书 ==="
echo "需要你确认域名 baimeixiaofan.xyz DNS 已指向本机:"
certbot --nginx -d baimeixiaofan.xyz -d www.baimeixiaofan.xyz --non-interactive --agree-tos -m baimeixiaofan@gmail.com || {
  echo "certbot 失败,稍后手动运行: certbot --nginx -d baimeixiaofan.xyz"
}
nginx -t && systemctl reload nginx

echo "=== 7. 首次同步 + 构建 + 部署 ==="
npm run sync:feishu
npm run build
mkdir -p /var/www/baimeixiaofan
cp -r dist/. /var/www/baimeixiaofan/

echo "=== 8. 设置定时同步 ==="
# 每 15 分钟同步一次(带锁)
cat > /etc/cron.d/blog-sync << 'CRONEOF'
SHELL=/bin/bash
*/15 * * * * root /opt/blog/scripts/server-sync.sh
CRONEOF
chmod 644 /etc/cron.d/blog-sync

touch /var/log/blog-sync.log
chmod 644 /var/log/blog-sync.log

echo "=== 完成 ==="
echo "https://baimeixiaofan.xyz"
echo ""
echo "同步日志: tail -f /var/log/blog-sync.log"
echo "手动同步: cd /opt/blog && npm run sync:feishu && npm run build && cp -r dist/. /var/www/baimeixiaofan/"
