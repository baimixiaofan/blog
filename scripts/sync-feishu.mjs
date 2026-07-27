#!/usr/bin/env node
// 飞书文档同步脚本 — 双模式
//
// 模式 A: 列出整个知识库(需要 App 是知识库成员,设 FEISHU_SPACE_ID)
// 模式 B: 同步 URL 列表里指定的文档(只需 docx 读取权限,设 FEISHU_DOC_URLS)
//
// 用法:
//   模式 A: FEISHU_APP_ID=... FEISHU_APP_SECRET=... FEISHU_SPACE_ID=... node scripts/sync-feishu.mjs
//   模式 B: FEISHU_APP_ID=... FEISHU_APP_SECRET=... FEISHU_DOC_URLS="url1,url2,url3" node scripts/sync-feishu.mjs
//
// 输出: src/content/blog/feishu-<slug>.md

import { writeFile, mkdir, readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const SPACE_ID = process.env.FEISHU_SPACE_ID;
const DOC_URLS = (process.env.FEISHU_DOC_URLS || '')
  .split(/[,\n]/)
  .map(s => s.trim())
  .filter(Boolean);

const BASE = 'https://open.feishu.cn/open-apis';
const OUT_DIR = 'src/content/blog';

if (!APP_ID || !APP_SECRET) {
  console.error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET');
  process.exit(1);
}
if (!SPACE_ID && DOC_URLS.length === 0) {
  console.error('需要 FEISHU_SPACE_ID (模式 A) 或 FEISHU_DOC_URLS (模式 B)');
  process.exit(1);
}

async function api(path, init = {}, token) {
  const url = `${BASE}${path}`;
  const headers = { ...init.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error ${data.code}: ${data.msg} (path: ${path})`);
  }
  return data.data;
}

async function apiFlat(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...init.headers } });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error ${data.code}: ${data.msg} (path: ${path})`);
  }
  return data;
}

async function getTenantToken() {
  const data = await apiFlat('/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  return data.tenant_access_token;
}

async function listAllNodes(token) {
  const all = [];
  let pageToken;
  do {
    const params = new URLSearchParams();
    if (pageToken) params.set('page_token', pageToken);
    const data = await api(`/wiki/v2/spaces/${SPACE_ID}/nodes${params.toString() ? '?' + params : ''}`, {}, token);
    all.push(...(data.items || []));
    pageToken = data.page_token;
  } while (pageToken);
  return all;
}

async function getDocContent(token, objToken) {
  const data = await api(`/docx/v1/documents/${objToken}/raw_content?lang=zh`, {}, token);
  return data.content;
}

function extractTokenFromUrl(url) {
  const m = url.match(/\/(wiki|docx|docs)\/([A-Za-z0-9_-]+)/);
  return m ? m[2] : null;
}

function sanitizeSlug(s) {
  return s
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

function yamlEscape(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

async function cleanOldFeishuFiles() {
  const files = await readdir(OUT_DIR).catch(() => []);
  for (const f of files) {
    if (f.startsWith('feishu-') && f.endsWith('.md')) {
      await unlink(join(OUT_DIR, f));
    }
  }
}

async function writeDoc({ token, title, content, sourceUrl }) {
  const slug = sanitizeSlug(title);
  const date = new Date().toISOString().slice(0, 10);
  const fm = [
    '---',
    `title: ${yamlEscape(title)}`,
    `summary: ${yamlEscape(`飞书云文档 · ${date}`)}`,
    `date: ${date}`,
    `url: ${sourceUrl}`,
    '---',
    '',
    content,
    '',
  ].join('\n');
  const outPath = join(OUT_DIR, `feishu-${slug}.md`);
  await writeFile(outPath, fm, 'utf-8');
  console.log(`   ✓ ${title}  →  ${outPath}`);
}

async function main() {
  console.log('1. 获取 tenant_access_token ...');
  const token = await getTenantToken();
  console.log('   ok');

  await mkdir(OUT_DIR, { recursive: true });
  console.log('2. 清理旧文件 (feishu-*.md) ...');
  await cleanOldFeishuFiles();

  if (DOC_URLS.length > 0) {
    console.log(`3. 模式 B:同步 ${DOC_URLS.length} 个 URL ...`);
    for (const url of DOC_URLS) {
      const objToken = extractTokenFromUrl(url);
      if (!objToken) {
        console.warn(`   ✗ 无法从 URL 提取 token: ${url}`);
        continue;
      }
      const content = await getDocContent(token, objToken);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : objToken;
      await writeDoc({ token, title, content, sourceUrl: url });
    }
  } else {
    console.log('3. 模式 A:列出知识库节点 ...');
    const nodes = await listAllNodes(token);
    console.log(`   ${nodes.length} 个节点`);
    const docs = nodes.filter(n => n.obj_type === 'docx' || n.obj_type === 'doc');
    console.log(`   其中 ${docs.length} 个文档`);
    console.log('4. 拉取并写入每个文档 ...');
    for (const doc of docs) {
      const content = await getDocContent(token, doc.obj_token);
      const url = `https://feishu.cn/wiki/${doc.node_token}`;
      await writeDoc({ token, title: doc.title || 'untitled', content, sourceUrl: url });
    }
  }

  console.log('\n完成。下一步: npm run build && npm run deploy');
}

main().catch(err => {
  console.error('\n✗ 同步失败:', err.message);
  if (err.message.includes('99991663')) {
    console.error('  → 权限不足:App 缺少 docx:document:readonly 权限');
  } else if (err.message.includes('99991672') || err.message.includes('231001')) {
    console.error('  → App ID/Secret 错误');
  } else if (err.message.includes('131002')) {
    console.error('  → space_id 错误 (需要数字 ID,不是 URL token)');
  } else if (err.message.includes('230002')) {
    console.error('  → 文档 token 无效或 App 无权访问该文档');
  }
  process.exit(1);
});
