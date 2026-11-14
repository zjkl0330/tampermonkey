import asyncio, json, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = """<!doctype html><html><head><meta charset="utf-8"><title>UC分享</title></head><body><div id="root"></div></body></html>"""
CORS = {
    'content_type': 'application/json',
    'headers': {
        'access-control-allow-origin': 'https://drive.uc.cn',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
    },
}


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        pg = await ctx.new_page()
        calls = []

        async def handler(route, request):
            u = request.url
            calls.append(request.method + ' ' + u.split('?')[0])
            if 'sharepage/token' in u:
                return await route.fulfill(status=200, body=json.dumps({'status': 200, 'data': {'stoken': 'st-1', 'title': '朋友的UC分享'}}), **CORS)
            if 'transfer_share/detail' in u:
                return await route.fulfill(status=200, body=json.dumps({'status': 200, 'data': {'list': [
                    {'fid': 'sf1', 'file_name': '分享文件.zip', 'size': 1024, 'dir': False, 'share_fid_token': 'tk1'}]}}), **CORS)
            if '/1/clouddrive/file/download' in u:
                return await route.fulfill(status=200, body=json.dumps({'status': 200, 'data': [
                    {'download_url': 'https://cdn.uc.example/s/1?sig=share', 'file_name': '分享文件.zip', 'size': 1024}]}), **CORS)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://drive.uc.cn'}, body=HTML)

        await pg.route('https://drive.uc.cn/**', handler)
        await pg.route('https://pc-api.uc.cn/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://drive.uc.cn/s/abc123', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)
        info = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return {title: (sr.getElementById('yx-title')||{}).textContent,
                  sub: (sr.getElementById('yx-sub')||{}).textContent,
                  tag: (sr.getElementById('yx-tag')||{}).textContent,
                  rows: [...sr.querySelectorAll('.row')].map(x=>x.dataset.fid)};
        }""")
        print('分享页:', info)
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(500)
        pos = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const b = sr.querySelector('.row [data-act=copy]');
          const r = b.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2};
        }""")
        await pg.mouse.click(pos['x'], pos['y'])
        await pg.wait_for_timeout(2500)
        toasts = await pg.evaluate("() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; return [...sr.querySelectorAll('.toast')].map(t=>t.textContent); }")
        print('toast:', toasts)
        print('请求:', calls)
        await b.close()

asyncio.run(main())
