#!/usr/bin/env node
// 飞书知识库同步脚本
// 用法:
//   FEISHU_APP_ID=cli_xxx FEISHU_APP_SECRET=xxx FEISHU_SPACE_ID=ZuqOwdeMEiXDaLk4TMScklwJnK7 node scripts/sync-feishu.mjs
//
// 输出: src/content/blog/feishu-<node_token>.md (每个文档一个文件)
//
// 需要飞书 App 拥有 wiki:wiki:readonly 权限,并被授权访问该知识库

import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const SPACE_ID = process.env.FEISHU_SPACE_ID;
const BASE = 'https://open.feishu.cn/open-apis';
const OUT_DIR = 'src/content/blog';

if (!APP_ID || !APP_SECRET || !SPACE_ID) {
  console.error('缺少环境变量。需要:');
  console.error('  FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_SPACE_ID');
  process.exit(1);
}

async function api(path, init = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { ...init, headers: { ...init.headers } });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error ${data.code}: ${data.msg} (path: ${path})`);
  }
  return data.data;
}

async function getTenantToken() {
  const data = await api('/auth/v3/tenant_access_token/internal', {
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
    const data = await api(`/wiki/v2/spaces/${SPACE_ID}/nodes?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    all.push(...(data.items || []));
    pageToken = data.page_token;
  } while (pageToken);
  return all;
}

async function getDocContent(token, objToken) {
  const params = new URLSearchParams({ lang: 'zh' });
  const data = await api(`/docx/v1/documents/${objToken}/raw_content?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.content; // markdown
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

async function main() {
  console.log('1. 获取 tenant_access_token ...');
  const token = await getTenantToken();
  console.log('   ok');

  console.log('2. 列出知识库节点 ...');
  const nodes = await listAllNodes(token);
  console.log(`   ${nodes.length} 个节点`);

  const docs = nodes.filter(n => n.obj_type === 'docx' || n.obj_type === 'doc');
  console.log(`   其中 ${docs.length} 个文档`);

  await mkdir(OUT_DIR, { recursive: true });
  console.log('3. 清理旧文件 (feishu-*.md) ...');
  await cleanOldFeishuFiles();

  console.log('4. 拉取并写入每个文档 ...');
  for (const doc of docs) {
    const title = doc.title || 'untitled';
    const slug = sanitizeSlug(title);
    const content = await getDocContent(token, doc.obj_token);
    const url = `https://${SPACE_ID.slice(0, 8)}.feishu.cn/wiki/${doc.node_token}`;
    const date = new Date().toISOString().slice(0, 10);

    const fm = [
      '---',
      `title: ${yamlEscape(title)}`,
      `summary: ${yamlEscape(`飞书知识库文档 · 创建于 ${date}`)}`,
      `date: ${date}`,
      `url: ${url}`,
      '---',
      '',
      content,
      '',
    ].join('\n');

    const outPath = join(OUT_DIR, `feishu-${slug}.md`);
    await writeFile(outPath, fm, 'utf-8');
    console.log(`   ✓ ${doc.node_token}  ${title}`);
  }

  console.log('\n完成。下一步: npm run build && npm run deploy');
}

main().catch(err => {
  console.error('\n✗ 同步失败:', err.message);
  if (err.message.includes('99991663') || err.message.includes('99991672')) {
    console.error('  → 权限不足:App 缺少 wiki:wiki:readonly 权限,或未被授权访问该知识库');
  } else if (err.message.includes('99991663') || err.message.includes('231001')) {
    console.error('  → App ID/Secret 错误');
  }
  process.exit(1);
});
