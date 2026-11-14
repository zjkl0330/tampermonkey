import asyncio, json, pathlib, urllib.parse as up
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = """<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div>
<script>setTimeout(()=>{fetch('https://api-pan.xunlei.com/drive/v1/files?parent_id=111&limit=50').catch(()=>{});},1500);</script>
</body></html>"""

def cors():
    return {'access-control-allow-origin':'https://pan.xunlei.com','access-control-allow-credentials':'true',
            'access-control-allow-headers':'content-type,authorization,x-captcha-token,x-device-id,x-client-id',
            'access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'}

def body(parent):
    if parent in ('', None):
        items=[{'id':'111','name':'相册','kind':'drive#folder','size':'0'},{'id':'222','name':'电影.mkv','kind':'drive#file','size':'1'}]
    else:
        items=[{'id':'333','name':'里面.txt','kind':'drive#file','size':'12'}]
    return json.dumps({'files':items,'next_page_token':''})

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':420,'height':900})
        pg=await ctx.new_page()
        async def handler(route, req):
            u=req.url
            if req.method=='OPTIONS': return await route.fulfill(status=204, headers=cors())
            if 'captcha/init' in u: return await route.fulfill(status=200, headers=cors(), body=json.dumps({'captcha_token':'ck','expires_in':300}))
            if '/drive/v1/files' in u:
                q=up.parse_qs(up.urlparse(u).query)
                return await route.fulfill(status=200, headers=cors(), body=body((q.get('parent_id') or [''])[0]))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://pan.xunlei.com/**', handler)
        await pg.route('https://api-pan.xunlei.com/**', handler)
        await pg.route('https://xluser-ssl.xunlei.com/**', handler)
        await pg.add_init_script(script="try{localStorage.setItem('credentials_Xqp0kJBXWhwaTpB6', JSON.stringify({access_token:'tok-123456789012'}))}catch(e){}")
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.xunlei.com/', wait_until='domcontentloaded')
        await pg.wait_for_timeout(1200)
        await pg.evaluate("() => { const f=document.getElementById('yunx-panlink-host'); if(f) f.shadowRoot.querySelector('[class*=fab]').click(); }")
        await pg.wait_for_timeout(400)
        before = await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.row[data-fid]')].map(x=>x.dataset.fid); }""")
        await pg.wait_for_timeout(4000)
        after = await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          return {rows:[...sr.querySelectorAll('.row[data-fid]')].map(x=>x.dataset.fid),
                  crumb:(sr.getElementById('yx-crumb')||{}).textContent}; }""")
        print('跟随前:', before)
        print('跟随结果:', after)
        await b.close()

asyncio.run(main())
