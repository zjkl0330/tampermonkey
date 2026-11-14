import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
import tempfile
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>城通网盘</title></head><body>
<div id="root"></div></body></html>"""

CDN = 'https://cdn.ctfile.example/d/9001?sign=zzz'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([
            {'name': 'ctfile_session', 'value': 'refresh-token-fake-9527', 'domain': '.ctfile.com', 'path': '/'},
        ])
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('  [console]', m.type, m.text[:200]))
        calls, bodies = [], []

        async def handler(route, request):
            u = request.url
            calls.append(request.method + ' ' + u.split('?')[0])
            try:
                bodies.append(u.split('/v4/')[-1].split('?')[0] + ' :: ' + str(request.post_data)[:120])
            except Exception:
                pass
            cors = {
                'content_type': 'application/json',
                'headers': {
                    'access-control-allow-origin': 'https://my.ctfile.com',
                    'access-control-allow-credentials': 'true',
                    'access-control-allow-headers': '*',
                    'access-control-allow-methods': '*',
                },
            }
            if '/v4/user/auth/refresh-token' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'token': 'tk-fake-1', 'expires_in': 900}}), **cors)
            if '/v4/user/profile/info' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'id': 5566, 'username': '测试城通'}}), **cors)
            if '/v4/file/browse/list' in u:
                body = {'code': 200, 'data': {'totalNum': 2, 'folder_id': 'd0', 'results': [
                    {'fid': 'f9001', 'name': '资料.zip', 'size': 20971520, 'is_folder': False, 'userid': 5566, 'date': 1794600000},
                    {'fid': 'd7001', 'name': '备份', 'size': 0, 'is_folder': True, 'date': 1794600000},
                ]}}
                return await route.fulfill(status=200, body=json.dumps(body), **cors)
            if '/v4/file/browse/direct-link' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'direct_urls': [{'name': '资料.zip', 'url': CDN}]}), **cors)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://my.ctfile.com'},
                                       body=HTML)

        await pg.route('https://my.ctfile.com/**', handler)
        await pg.route('https://api.ctfile.com/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://my.ctfile.com/#folder=d0', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3500)

        info = await pg.evaluate("""() => {
          const host = document.getElementById('yunx-panlink-host');
          if (!host || !host.shadowRoot) return {host:false};
          const sr = host.shadowRoot;
          return {host:true,
            badge: (sr.getElementById('yx-badge')||{}).textContent,
            title: (sr.getElementById('yx-title')||{}).textContent,
            tag: (sr.getElementById('yx-tag')||{}).textContent,
            sub: (sr.getElementById('yx-sub')||{}).textContent,
            err: (sr.querySelector('.err')||{}).textContent};
        }""")
        print('挂载:', info)

        await pg.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()""")
        await pg.wait_for_timeout(700)
        rows = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.row')].map(x => ({fid:x.dataset.fid, txt:x.textContent.trim().replace(/\\s+/g,' ').slice(0,40)}));
        }""")
        print('面板条目:', rows)
        await pg.screenshot(path=str(SHOT / 'ct_mine.png'))

        box = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const el = sr.querySelector('input[type=checkbox][data-fid]');
          const r = el.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2};
        }""")
        await pg.mouse.click(box['x'], box['y'])
        await pg.wait_for_timeout(400)
        btn = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const b = sr.getElementById('yx-copy-sel');
          const r = b.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2};
        }""")
        await pg.mouse.click(btn['x'], btn['y'])
        await pg.wait_for_timeout(3000)
        toasts = await pg.evaluate("() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; return [...sr.querySelectorAll('.toast')].map(t=>t.textContent); }")
        print('toast:', toasts)
        print('请求:', calls)
        print('请求体:', bodies)
        await b.close()

asyncio.run(main())
