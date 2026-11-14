import asyncio, json, pathlib
from playwright.async_api import async_playwright
SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = """<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-table'></div>
<script>
setTimeout(() => { fetch('/api/file/list/new?driveId=0&parentFileId=2&Page=1').catch(()=>{}); }, 600);
</script></body></html>"""
tok = 'fake-token-for-test-1234567890'

def body(parent):
    if parent == '0':
        items = [{'FileId':2,'FileName':'相册','Size':0,'Type':1}]
    else:
        items = [{'FileId':9,'FileName':'里面.txt','Size':12,'Type':0,'Etag':'e','S3KeyFlag':'s'}]
    return json.dumps({'code':0,'data':{'Next':'-1','Total':len(items),'InfoList':items}})

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 420, 'height': 900})
        pg = await ctx.new_page()
        calls = []
        async def handler(route, req):
            u = req.url
            calls.append(u)
            if u.endswith('/api/user/info'):
                return await route.fulfill(status=200, content_type='application/json', body='{"code":0,"data":{"Nickname":"测试号"}}')
            if '/api/file/list/new' in u:
                import urllib.parse as up
                q = up.parse_qs(up.urlparse(u).query)
                return await route.fulfill(status=200, content_type='application/json', body=body((q.get('parentFileId') or ['0'])[0]))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://yun.123pan.cn/**', handler)
        await pg.add_init_script(script=f"try{{localStorage.setItem('accessToken','{tok}')}}catch(e){{}}")
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://yun.123pan.cn/main', wait_until='domcontentloaded')
        await pg.wait_for_timeout(4500)   # 等页面自己的请求 + 监听 tick
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(900)
        st = await pg.evaluate("""() => { const h=document.getElementById('yunx-panlink-host'); if(!h||!h.shadowRoot) return {host:false};
          const sr=h.shadowRoot; return {sub:(sr.getElementById('yx-sub')||{}).textContent, crumb:(sr.getElementById('yx-crumb')||{}).textContent,
          rows:[...sr.querySelectorAll('.row[data-fid]')].map(x=>x.textContent.trim().slice(0,14))}; }""")
        print('跟随结果:', st)
        import urllib.parse as up
        for c in calls:
            if '/api/file/list/new' in c:
                q = up.parse_qs(up.urlparse(c).query)
                print('  list parent=', q.get('parentFileId'), 'Page=', q.get('Page'))
        await b.close()
asyncio.run(main())
