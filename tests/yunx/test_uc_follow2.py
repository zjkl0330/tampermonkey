import asyncio, json, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = """<!doctype html><html><head><meta charset="utf-8"><title>UC网盘</title></head><body><div id="root"></div></body></html>"""

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
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-fake-abc', 'domain': '.uc.cn', 'path': '/'}])
        pg = await ctx.new_page()
        calls = []
        pg.on('console', lambda m: print('   [console]', m.type, m.text[:160]))

        async def handler(route, request):
            u = request.url
            calls.append(u)
            if '/1/clouddrive/file/sort' in u:
                from urllib.parse import urlparse, parse_qs
                q = parse_qs(urlparse(u).query)
                pdir = (q.get('pdir_fid') or ['0'])[0]
                if pdir == 'd2002':
                    body = {'status': 200, 'data': {'total': 1, 'list': [
                        {'fid': 'f3003', 'file_name': '照片.jpg', 'size': 2048, 'dir': False}]}}
                elif pdir == 'd9009':
                    body = {'status': 200, 'data': {'total': 1, 'list': [
                        {'fid': 'f9010', 'file_name': '页面里打开的文件.txt', 'size': 10, 'dir': False}]}}
                else:
                    body = {'status': 200, 'data': {'total': 2, 'list': [
                        {'fid': 'f1001', 'file_name': '电影.mkv', 'size': 104857600, 'dir': False},
                        {'fid': 'd2002', 'file_name': '相册', 'size': 0, 'dir': True}]}}
                return await route.fulfill(status=200, body=json.dumps(body), **CORS)
            if 'account/info' in u:
                return await route.fulfill(status=200, body=json.dumps({'code': 'OK', 'data': {'nickname': '测试UC号'}}), **CORS)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://drive.uc.cn'}, body=HTML)

        await pg.route('https://drive.uc.cn/**', handler)
        await pg.route('https://pc-api.uc.cn/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://drive.uc.cn/main', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)
        print('初始:', await pg.evaluate("() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row')].map(x=>x.dataset.fid)"))
        # 不手动导航，模拟页面自己切到 d9009
        await pg.evaluate("""() => fetch('https://pc-api.uc.cn/1/clouddrive/file/sort?pr=UCBrowser&fr=pc&pdir_fid=d9009&_page=1&_size=50').then(r=>r.text()).catch(()=>{})""")
        await pg.wait_for_timeout(5000)
        print('跟随结果:', await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return {rows: [...sr.querySelectorAll('.row')].map(x=>x.dataset.fid),
                  crumb: (sr.getElementById('yx-crumb')||{}).style.display + '|' + (sr.getElementById('yx-crumb')||{}).textContent};
        }"""))
        await b.close()

asyncio.run(main())
