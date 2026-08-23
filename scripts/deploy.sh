#!/usr/bin/env bash
set -e

# Server config (defaults match this project)
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_HOST="${DEPLOY_HOST:-47.109.191.13}"
SERVER_PORT="${DEPLOY_PORT:-22}"
SERVER_DIR="/var/www/baimeixiaofan"

echo "Building..."
npm run build

echo "Cleaning $SERVER_USER@$SERVER_HOST:$SERVER_DIR ..."
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "find $SERVER_DIR -mindepth 1 ! -path '$SERVER_DIR/.well-known*' -delete"

echo "Deploying to $SERVER_USER@$SERVER_HOST:$SERVER_DIR ..."
scp -P "$SERVER_PORT" -r dist/. "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/"

echo "Done. Visit https://baimeixiaofan.xyz"
