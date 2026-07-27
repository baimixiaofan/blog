# Personal Blog

A personal blog built with [Astro](https://astro.build).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

The site deploys to `https://baimeixiaofan.xyz` via SSH/SCP. Requires the local SSH public key to be installed at `/root/.ssh/authorized_keys` on the server.

```bash
export DEPLOY_USER=root
export DEPLOY_HOST=47.109.191.13
export DEPLOY_PORT=22
npm run deploy
```

Defaults: `DEPLOY_USER=root`, `DEPLOY_HOST=47.109.191.13`, `DEPLOY_PORT=22`. Override with env vars above.

What `npm run deploy` does:
1. `npm run build` → regenerates `dist/`
2. `scp -P $DEPLOY_PORT -r dist/. $DEPLOY_USER@$DEPLOY_HOST:/var/www/baimeixiaofan/`

## Server (one-time setup, already done)

- Ubuntu 26.04, nginx 1.28, certbot 4.0
- Site root: `/var/www/baimeixiaofan/`
- Nginx config: `/etc/nginx/sites-available/baimeixiaofan`
- HTTPS via Let's Encrypt (auto-renews via `certbot.timer`)
