const t = await (await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})
})).json().then(d=>d.tenant_access_token);
const r = await fetch('https://open.feishu.cn/open-apis/wiki/v2/spaces?page_size=50',{
  headers:{Authorization:'Bearer '+t}
});
const d = await r.json();
console.log('code:', d.code, 'msg:', d.msg);
if (d.data?.items) {
  for (const s of d.data.items) {
    console.log('  space:', s.space_id, s.name, s.space_type);
  }
} else {
  console.log('  no spaces or error');
}
