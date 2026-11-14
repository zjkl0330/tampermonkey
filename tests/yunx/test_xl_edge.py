import asyncio, json, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div></body></html>"

def cors():
    return {'access-control-allow-origin':'https://pan.xunlei.com','access-control-allow-credentials':'true',
            'access-control-allow-headers':'content-type,authorization,x-captcha-token,x-device-id,x-client-id',
            'access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'}

async def run(kind):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':420,'height':900}, locale='zh-CN')
        pg = await ctx.new_page()
        async def handler(route, req):
            u = req.url
            if req.method=='OPTIONS': return await route.fulfill(status=204, headers=cors())
            if 'captcha/init' in u:
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'captcha_token':'ck.test','expires_in':300}))
            if '/drive/v1/files' in u:
                if kind == 'expired':
                    return await route.fulfill(status=401, headers=cors(), body=json.dumps({'error':'unauthenticated','error_description':'帐号认证失败，请重新登录'}))
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'files':[],'next_page_token':''}))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://pan.xunlei.com/**', handler)
        await pg.route('https://api-pan.xunlei.com/**', handler)
        await pg.route('https://xluser-ssl.xunlei.com/**', handler)
        if kind == 'expired':
            await pg.add_init_script(script="try{localStorage.setItem('credentials_Xqp0kJBXWhwaTpB6', JSON.stringify({access_token:'expired-token-123456'}))}catch(e){}")
        await pg.add_init_script(script=SCRIPT)
        url = 'https://pan.xunlei.com/login/' if kind == 'nologin' else 'https://pan.xunlei.com/'
        await pg.goto(url, wait_until='domcontentloaded')
        await pg.wait_for_timeout(4000)
        st = await pg.evaluate("""() => { const h=document.getElementById('yunx-panlink-host');
          if(!h||!h.shadowRoot) return {host:false};
          const sr=h.shadowRoot; return {host:true, badge:(sr.getElementById('yx-badge')||{}).textContent,
            title:(sr.getElementById('yx-title')||{}).textContent, sub:(sr.getElementById('yx-sub')||{}).textContent,
            tag:(sr.getElementById('yx-tag')||{}).textContent}; }""")
        print(f'[{kind}]', st)
        if st.get('host'):
            await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
            await pg.wait_for_timeout(700)
            body = await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
              const e=sr.querySelector('.err') || sr.querySelector('.empty'); return e? e.textContent.trim().slice(0,90):''; }""")
            print(f'[{kind}] 面板提示:', body)
        await b.close()

asyncio.run(run('nologin'))
asyncio.run(run('expired'))
