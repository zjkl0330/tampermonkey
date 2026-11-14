import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
import tempfile
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)
HTML = """<!doctype html><html><head><meta charset="utf-8"><title>城通网盘</title></head><body><div id="root"></div></body></html>"""
CORS = {
    'content_type': 'application/json',
    'headers': {
        'access-control-allow-origin': 'https://my.ctfile.com',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
    },
}


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': 'ctfile_session', 'value': 'rt', 'domain': '.ctfile.com', 'path': '/'}])
        pg = await ctx.new_page()
        calls = []

        async def handler(route, request):
            u = request.url
            calls.append(u)
            if '/v4/user/auth/refresh-token' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'token': 'tk'}}), **CORS)
            if '/v4/user/profile/info' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'id': 5566, 'username': '测试城通'}}), **CORS)
            if '/v4/file/browse/list' in u:
                try:
                    folder = json.loads(request.post_data or '{}').get('folder_id', 'd0')
                except Exception:
                    folder = 'd0'
                if folder == 'd7001':
                    res = [{'fid': 'f7002', 'name': '备份里.txt', 'size': 12, 'is_folder': False}]
                else:
                    res = [{'fid': 'f9001', 'name': '资料.zip', 'size': 1024, 'is_folder': False},
                           {'fid': 'd7001', 'name': '备份', 'size': 0, 'is_folder': True}]
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'totalNum': len(res), 'results': res}}), **CORS)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://my.ctfile.com'}, body=HTML)

        await pg.route('https://my.ctfile.com/**', handler)
        await pg.route('https://api.ctfile.com/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://my.ctfile.com/#folder=d0', wait_until='domcontentloaded')
        await pg.wait_for_timeout(2800)
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)
        print('初始:', await pg.evaluate("() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row')].map(x=>x.dataset.fid)"))

        # 页面自身 hash 路由切到子目录
        await pg.evaluate("() => { location.hash = '#folder=d7001'; }")
        await pg.wait_for_timeout(4500)
        print('hash 切换后:', await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return {rows: [...sr.querySelectorAll('.row')].map(x=>x.dataset.fid),
                  crumb: (sr.getElementById('yx-crumb')||{}).textContent};
        }"""))
        print('list 请求:', [json.loads(c and '{}') if False else c.split('/v4/')[-1][:40] for c in calls if 'browse/list' in c])
        await pg.screenshot(path=str(SHOT / 'ct_follow.png'))
        await b.close()

asyncio.run(main())
