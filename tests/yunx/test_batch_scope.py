import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div class="list"><div>a.mkv</div><div>b.zip</div><div>c.txt</div></div></body></html>"""

CDN = 'https://cdn.quark.example/down/'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()

        await pg.add_init_script(script="""
          window.__opened = [];
          window.open = function (u) { window.__opened.push(String(u || '')); return { closed:false, location:{href:''}, close(){}, focus(){} }; };
        """)

        asked = []

        async def handler(route, request):
            u = request.url
            cors = {
                'content_type': 'application/json',
                'headers': {
                    'access-control-allow-origin': 'https://pan.quark.cn',
                    'access-control-allow-credentials': 'true',
                    'access-control-allow-headers': '*',
                    'access-control-allow-methods': '*',
                },
            }
            if '/1/clouddrive/file/sort' in u:
                lst = [
                    {'fid': 'f1', 'file_name': 'a.mkv', 'size': 1024, 'dir': False},
                    {'fid': 'f2', 'file_name': 'b.zip', 'size': 2048, 'dir': False},
                    {'fid': 'f3', 'file_name': 'c.txt', 'size': 64, 'dir': False},
                ]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': lst}}), **cors)
            if '/1/clouddrive/file/download' in u:
                body = json.loads(request.post_data or '{}')
                fids = body.get('fids') or ['x']
                asked.append(list(fids))
                out = [{'download_url': CDN + f, 'file_name': f + '.bin', 'size': 1024} for f in fids]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': out}), **cors)
            if 'account/info' in u:
                return await route.fulfill(status=200, body=json.dumps(
                    {'success': True, 'data': {'nickname': '测试夸克号'}}), **cors)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://pan.quark.cn'},
                                       body=HTML)

        await pg.route('https://pan.quark.cn/**', handler)
        await pg.route('https://drive-pc.quark.cn/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.quark.cn/list', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)

        # 浏览器直下模式，测试能数到 window.open 次数
        await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const dm = sr.getElementById('yx-dl-mode');
          dm.value = 'browser';
          dm.dispatchEvent(new Event('change'));
        }""")

        # 全选 3 个，然后只搜 a.mkv
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-select-all').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const inp = sr.getElementById('yx-search');
          inp.value = 'a.mkv';
          inp.dispatchEvent(new Event('input'));
        }""")
        await pg.wait_for_timeout(400)

        status = await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-status').textContent")
        print('状态栏:', status)

        btn = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const b = sr.getElementById('yx-dl-sel');
          const r = b.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2, disabled: b.disabled};
        }""")
        await pg.mouse.click(btn['x'], btn['y'])
        await pg.wait_for_timeout(3000)

        toasts = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.toast')].map(t=>t.textContent);
        }""")
        print('取链请求:', asked)
        print('toast:', toasts)
        print('只取了 f1 的链:', asked == [['f1']])
        print('提示跳过:', any('跳过' in t for t in toasts))
        await pg.screenshot(path=str(SHOT / 'quark_batch_scope.png'))
        await b.close()

asyncio.run(main())
