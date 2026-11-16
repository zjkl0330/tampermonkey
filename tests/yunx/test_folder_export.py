import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div class="list"><div>相册</div></div></body></html>"""

CDN = 'https://cdn.quark.example/down/'
N = 25   # 超过 20 个，应改走 Aria2 清单

FILES = [{'fid': 'f%d' % i, 'file_name': '%d.mp4' % i, 'size': 1024 * i, 'dir': False} for i in range(1, N + 1)]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()

        await pg.add_init_script(script="""
          window.__blobs = [];
          const _create = URL.createObjectURL.bind(URL);
          URL.createObjectURL = function (b) { window.__blobs.push(b); return _create(b); };
        """)

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
                if 'pdir_fid=d1' in u:
                    lst = FILES
                else:
                    lst = [{'fid': 'd1', 'file_name': '相册', 'size': 0, 'dir': True}]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': lst}}), **cors)
            if '/1/clouddrive/file/download' in u:
                body = json.loads(request.post_data or '{}')
                fids = body.get('fids') or ['x']
                out = [{'download_url': CDN + f, 'file_name': f + '.mp4', 'size': 1024} for f in fids]
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

        btn = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const b = sr.querySelector('[data-act=dir-dl]');
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2, label: b.textContent};
        }""")
        print('全下按钮:', btn)
        if not btn:
            await b.close()
            return
        await pg.mouse.click(btn['x'], btn['y'])
        print('已点击，等待扫描与导出…')
        await pg.wait_for_timeout(9000)
        mid = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.toast')].map(t=>t.textContent);
        }""")
        print('中途 toast:', mid)
        await pg.wait_for_timeout(16000)

        toasts = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.toast')].map(t=>t.textContent);
        }""")
        script = await pg.evaluate("""async () => {
          const b = (window.__blobs || []).filter(x => x.type && x.type.indexOf('text/plain') >= 0).pop();
          return b ? await b.text() : '';
        }""")
        print('toast:', toasts)
        lines = script.split('\n')
        print('脚本行数:', len(lines))
        print('前 6 行:', lines[:6])
        print('有 mkdir:', 'mkdir -p "相册"' in script)
        print('带目录参数:', '-d "相册" -o "1.mp4"' in script)
        print('文件数:', len([l for l in lines if l.startswith('aria2c')]))
        await pg.screenshot(path=str(SHOT / 'quark_dir_export.png'))
        await b.close()

asyncio.run(main())
