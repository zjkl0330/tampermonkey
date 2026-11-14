import asyncio, json, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
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


async def run(case, with_cookie, direct_ok):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        if with_cookie:
            await ctx.add_cookies([{'name': 'ctfile_session', 'value': 'rt-fake', 'domain': '.ctfile.com', 'path': '/'}])
        pg = await ctx.new_page()
        calls = []
        pg.on('console', lambda m: print('   [console]', m.type, m.text[:160]))

        async def handler(route, request):
            u = request.url
            calls.append(request.method + ' ' + u.split('?')[0])
            if '/v4/user/auth/refresh-token' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'token': 'tk-1'}}), **CORS)
            if '/v4/user/profile/info' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'id': 5566, 'username': '测试城通'}}), **CORS)
            if '/v4/file/browse/list' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'data': {'totalNum': 1, 'results': [
                    {'fid': 'f9001', 'name': '资料.zip', 'size': 20971520, 'is_folder': False, 'userid': 5566}]}}), **CORS)
            if '/v4/file/browse/direct-link' in u:
                if not direct_ok:
                    return await route.fulfill(status=200, body=json.dumps({'code': 403, 'message': '需要会员'}), **CORS)
                return await route.fulfill(status=200, body=json.dumps({'code': 200, 'direct_urls': [{'name': '资料.zip', 'url': 'https://cdn.ctfile.example/x'}]}), **CORS)
            if 'urlapi.ctfile.com' in u:
                return await route.fulfill(status=403, body='{"code":403}', **CORS)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://my.ctfile.com'}, body=HTML)

        await pg.route('https://my.ctfile.com/**', handler)
        await pg.route('https://api.ctfile.com/**', handler)
        await pg.route('https://urlapi.ctfile.com/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://my.ctfile.com/', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

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
        print(f'[{case}] 挂载:', info)

        await pg.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()""")
        await pg.wait_for_timeout(600)
        rows = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.row')].map(x => x.dataset.fid);
        }""")
        print(f'[{case}] 行:', rows)

        # 取链：点行内「复制」按钮
        if rows:
            pos = await pg.evaluate("""() => {
              const sr = document.getElementById('yunx-panlink-host').shadowRoot;
              const b = sr.querySelector('.row [data-act=copy]');
              if (!b) return null;
              const r = b.getBoundingClientRect();
              return {x: r.left + r.width/2, y: r.top + r.height/2};
            }""")
            if pos:
                await pg.mouse.click(pos['x'], pos['y'])
                await pg.wait_for_timeout(6000)
        toasts = await pg.evaluate("() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; return [...sr.querySelectorAll('.toast')].map(t=>t.textContent); }")
        print(f'[{case}] toast:', toasts)
        print(f'[{case}] 请求:', [c for c in calls if 'my.ctfile.com/' != c.split(' ')[1]])
        await b.close()


async def main():
    print('=== A. 未登录（没有 ctfile_session）')
    await run('未登录', False, True)
    print()
    print('=== B. 已登录但 direct-link 被拒（免费号）→ 应回退分享解析')
    await run('免费回退', True, False)

asyncio.run(main())
