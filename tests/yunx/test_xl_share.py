import asyncio, json, pathlib
from playwright.async_api import async_playwright
SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div></body></html>"
def cors():
    return {'access-control-allow-origin':'https://pan.xunlei.com','access-control-allow-credentials':'true',
            'access-control-allow-headers':'content-type,authorization,x-captcha-token,x-device-id,x-client-id',
            'access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':420,'height':900}); pg=await ctx.new_page()
        calls=[]
        async def handler(route, req):
            u=req.url; calls.append(u.split('?')[0])
            if req.method=='OPTIONS': return await route.fulfill(status=204, headers=cors())
            if 'captcha/init' in u: return await route.fulfill(status=200, headers=cors(), body=json.dumps({'captcha_token':'ck','expires_in':300}))
            if '/drive/v1/share' in u and '/share/' not in u:
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'data':{'title':'朋友的分享','share_status':'OK','files':[
                    {'id':'9','name':'分享文件.zip','kind':'drive#file','size':'2048'}]}}))
            if '/drive/v1/files' in u:
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'files':[]}))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://pan.xunlei.com/**', handler)
        await pg.route('https://api-pan.xunlei.com/**', handler)
        await pg.route('https://xluser-ssl.xunlei.com/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.xunlei.com/s/abcXYZ123', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3500)
        st = await pg.evaluate("""() => { const h=document.getElementById('yunx-panlink-host'); if(!h||!h.shadowRoot) return {host:false};
          const sr=h.shadowRoot; return {title:(sr.getElementById('yx-title')||{}).textContent, sub:(sr.getElementById('yx-sub')||{}).textContent,
          tag:(sr.getElementById('yx-tag')||{}).textContent}; }""")
        await pg.evaluate("() => { const f=document.getElementById('yunx-panlink-host'); if(f) f.shadowRoot.querySelector('[class*=fab]').click(); }")
        await pg.wait_for_timeout(700)
        rows = await pg.evaluate("""() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row[data-fid]')].map(x=>x.querySelector('.txt').textContent)""")
        print('分享页:', st, '| 行:', rows)
        print('请求:', calls)
        await b.close()
asyncio.run(main())
