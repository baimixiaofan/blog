#!/usr/bin/env node
// 飞书知识库同步脚本 (模式 A:整库自动同步)
//
// 用法:
//   FEISHU_APP_ID=... FEISHU_APP_SECRET=... FEISHU_WIKI_URL=https://xxx.feishu.cn/wiki/<token> node scripts/sync-feishu.mjs
//
// FEISHU_WIKI_URL 是知识库里任一文档的完整 URL。
// 脚本会从 URL 提取 token,用 get_node 解析出 space_id,然后列出所有文档。
//
// App 必须有 wiki:wiki:readonly + docx:document:readonly 权限,且被授权访问该知识库。

import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const WIKI_URL = process.env.FEISHU_WIKI_URL;
const DOC_URLS = (process.env.FEISHU_DOC_URLS || '')
  .split(/[,\n]/)
  .map(s => s.trim())
  .filter(Boolean);

const EXCLUDE_TITLES = (process.env.FEISHU_EXCLUDE_TITLES || '')
  .split(/[,，、]/)
  .map(s => s.trim())
  .filter(Boolean);

const BASE = 'https://open.feishu.cn/open-apis';
const OUT_DIR = 'src/content/blog';

if (!APP_ID || !APP_SECRET) {
  console.error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET');
  process.exit(1);
}
if (!WIKI_URL && DOC_URLS.length === 0) {
  console.error('需要 FEISHU_WIKI_URL (整库模式) 或 FEISHU_DOC_URLS (URL 列表模式)');
  process.exit(1);
}

async function api(path, init = {}, token) {
  const headers = { ...init.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = await res.json();
  if (data.code !== 0) {
    const e = new Error(`Feishu API error ${data.code}: ${data.msg} (path: ${path})`);
    e.code = data.code;
    throw e;
  }
  return data.data;
}

async function getTenantToken() {
  const res = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Feishu API error ${data.code}: ${data.msg} (auth)`);
  }
  return data.tenant_access_token;
}

function extractTokenFromUrl(url) {
  const m = url.match(/\/(wiki|docx|docs)\/([A-Za-z0-9_-]+)/);
  return m ? m[2] : null;
}

async function resolveSpaceId(token, t) {
  const params = new URLSearchParams({ token, obj_type: 'wiki' });
  const data = await api(`/wiki/v2/spaces/get_node?${params}`, {}, t);
  if (!data.node?.space_id) {
    throw new Error('get_node 返回里找不到 space_id');
  }
  return { spaceId: data.node.space_id, nodeToken: data.node.node_token, title: data.node.title };
}

async function resolveNodeToObj(nodeToken, t) {
  const params = new URLSearchParams({ token: nodeToken, obj_type: 'wiki' });
  const data = await api(`/wiki/v2/spaces/get_node?${params}`, {}, t);
  const node = data.node;
  return { objToken: node.obj_token, title: node.title, objType: node.obj_type };
}

async function listAllNodes(spaceId, t) {
  const all = [];
  let pageToken;
  do {
    const params = new URLSearchParams();
    if (pageToken) params.set('page_token', pageToken);
    const qs = params.toString();
    const data = await api(`/wiki/v2/spaces/${spaceId}/nodes${qs ? '?' + qs : ''}`, {}, t);
    all.push(...(data.items || []));
    pageToken = data.page_token;
  } while (pageToken);
  return all;
}

async function getDocContent(t, objToken) {
  // 注意:有些文档/账号组合传 lang=zh 会返回 99992402 字段验证错误
  // 不传 lang 是最稳的写法
  const data = await api(`/docx/v1/documents/${objToken}/raw_content`, {}, t);
  return data.content;
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

async function writeDoc({ title, content, sourceUrl }) {
  const slug = sanitizeSlug(title);
  const date = new Date().toISOString().slice(0, 10);
  const fm = [
    '---',
    `title: ${yamlEscape(title)}`,
    `summary: ${yamlEscape(`飞书云文档 · 同步于 ${date}`)}`,
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
    console.log(`3. URL 列表模式:同步 ${DOC_URLS.length} 个文档 ...`);
    for (const url of DOC_URLS) {
      const wikiToken = extractTokenFromUrl(url);
      if (!wikiToken) {
        console.warn(`   ✗ 无法从 URL 提取 token: ${url}`);
        continue;
      }
      // URL 里的 token 是 wiki node token,需先解析出 docx obj_token
      const { objToken, title: wikiTitle, objType } = await resolveNodeToObj(wikiToken, token);
      if (objType !== 'docx') {
        console.warn(`   ✗ 跳过 ${wikiTitle || wikiToken}: obj_type=${objType} (暂只支持 docx)`);
        continue;
      }
      const content = await getDocContent(token, objToken);
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : wikiTitle;
      if (EXCLUDE_TITLES.some(t => title.includes(t))) {
        console.log(`   - 跳过 "${title}" (已排除)`);
        continue;
      }
      await writeDoc({ title, content, sourceUrl: url });
    }
  } else {
    console.log('3. 整库模式:从 URL 解析 token ...');
    const urlToken = extractTokenFromUrl(WIKI_URL);
    if (!urlToken) {
      throw new Error(`无法从 WIKI_URL 提取 token: ${WIKI_URL}`);
    }
    console.log(`   token: ${urlToken}`);

    console.log('4. 用 get_node 解析出 space_id ...');
    const { spaceId, title: rootTitle } = await resolveSpaceId(urlToken, token);
    console.log(`   space_id: ${spaceId}  根节点: ${rootTitle}`);

    console.log('5. 列出所有节点 ...');
    const nodes = await listAllNodes(spaceId, token);
    console.log(`   共 ${nodes.length} 个节点`);

    const docs = nodes.filter(n => n.obj_type === 'docx' || n.obj_type === 'doc');
    console.log(`   其中 ${docs.length} 个文档`);

    console.log('6. 拉取并写入每个文档 ...');
    for (const doc of docs) {
      const docTitle = doc.title || 'untitled';
      if (EXCLUDE_TITLES.some(t => docTitle.includes(t))) {
        console.log(`   - 跳过 "${docTitle}" (已排除)`);
        continue;
      }
      try {
        const content = await getDocContent(token, doc.obj_token);
        const url = `https://feishu.cn/wiki/${doc.node_token}`;
        await writeDoc({ title: docTitle, content, sourceUrl: url });
      } catch (err) {
        console.warn(`   ✗ 跳过 ${doc.title || doc.node_token}: ${err.message}`);
      }
    }
  }

  console.log('\n完成。下一步: npm run build && npm run deploy');
}

main().catch(err => {
  console.error('\n✗ 同步失败:', err.message);
  if (err.code === 99991663) {
    console.error('\n  → 权限不足。检查:');
    console.error('    1. App 是否已开启机器人能力(应用能力 → 机器人)');
    console.error('    2. App 是否被加进知识库(知识库根目录 → 成员管理 → 添加 → 搜 App 名字)');
    console.error('    3. App 是否有 wiki:wiki:readonly + docx:document:readonly 权限');
  } else if (err.code === 99991672 || err.code === 231001) {
    console.error('  → App ID 或 App Secret 错误');
  } else if (err.code === 131002) {
    console.error('  → 知识库不存在或 App 无权访问');
  } else if (err.code === 230002) {
    console.error('  → 文档 token 无效');
  }
  process.exit(1);
});
