import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div>电影.mkv</div></body></html>"""
CDN = 'https://cdn.quark.example/down/'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()

        await pg.add_init_script(script="""
          window.__opened = [];
          window.open = function (u) {
            const loc = { _u: '' };
            Object.defineProperty(loc, 'href', {
              get(){ return loc._u; },
              set(v){ loc._u = v; window.__opened.push(String(v || '')); }
            });
            return { closed: false, location: loc, close(){}, focus(){} };
          };
        """)

        sorts = []

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
                pdir = ''
                if 'pdir_fid=' in u:
                    pdir = u.split('pdir_fid=')[1].split('&')[0]
                sorts.append(pdir)
                if pdir == 'd1':
                    lst = [
                        {'fid': 'f2', 'file_name': '子文件A.txt', 'size': 300, 'dir': False},
                        {'fid': 'd2', 'file_name': '更深一层', 'size': 0, 'dir': True},
                    ]
                elif pdir == 'd2':
                    lst = [{'fid': 'f3', 'file_name': '底层.txt', 'size': 400, 'dir': False}]
                else:
                    lst = [
                        {'fid': 'd1', 'file_name': '相册', 'size': 0, 'dir': True},
                        {'fid': 'f1', 'file_name': 'a.mkv', 'size': 100, 'dir': False},
                    ]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': lst}}), **cors)
            if '/1/clouddrive/file/download' in u:
                body = json.loads(request.post_data or '{}')
                out = [{'download_url': CDN + f, 'file_name': f, 'size': 1} for f in (body.get('fids') or [])]
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

        await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const dm = sr.getElementById('yx-dl-mode');
          dm.value = 'browser';
          dm.dispatchEvent(new Event('change'));
        }""")

        pos = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const b = sr.querySelector('.folder [data-act="dir-dl"]');
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return {x: r.left + r.width/2, y: r.top + r.height/2, text: b.textContent};
        }""")
        print('全下按钮:', pos)
        await pg.mouse.click(pos['x'], pos['y'])
        await pg.wait_for_timeout(9000)

        opened = await pg.evaluate("() => (window.__opened||[]).filter(u=>u.indexOf('cdn.quark')>=0)")
        toasts = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.toast')].map(t=>t.textContent);
        }""")
        print('扫描过的目录:', sorts)
        print('打开直链:', opened)
        print('toast:', toasts)
        await pg.screenshot(path=str(SHOT / 'quark_dir_dl.png'))
        await b.close()


asyncio.run(main())
