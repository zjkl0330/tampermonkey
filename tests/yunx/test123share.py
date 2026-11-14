import asyncio, json, pathlib
from playwright.async_api import async_playwright
SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div></body></html>"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 420, 'height': 900})
        pg = await ctx.new_page()
        calls = []
        async def handler(route, req):
            u = req.url
            calls.append(u.split('?')[0])
            if '/b/api/share/get' in u:
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'code':0,'data':{'ShareName':'朋友的分享','Next':'-1','InfoList':[{'FileId':11,'FileName':'分享文件.zip','Size':2048,'Type':0,'Etag':'e','S3KeyFlag':'sk'}]}}))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://www.123pan.com/**', handler)
        await pg.route('https://yun.123pan.cn/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://www.123pan.com/s/abc123-def456', wait_until='domcontentloaded')
        await pg.wait_for_timeout(2500)
        st = await pg.evaluate("""() => { const h=document.getElementById('yunx-panlink-host');
          if(!h||!h.shadowRoot) return {host:false}; const sr=h.shadowRoot;
          return {title:(sr.getElementById('yx-title')||{}).textContent, sub:(sr.getElementById('yx-sub')||{}).textContent, tag:(sr.getElementById('yx-tag')||{}).textContent}; }""")
        print('分享页:', st)
        print('请求:', calls)
        await b.close()
asyncio.run(main())
