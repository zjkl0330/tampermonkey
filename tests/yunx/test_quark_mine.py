import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
import tempfile
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div class="list"><div>电影.mkv</div></div></body></html>"""

CDN = 'https://cdn.quark.example/down/f1?sign=abc'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([
            {'name': '__puus', 'value': 'puus-quark-fake-123456', 'domain': '.quark.cn', 'path': '/'},
            {'name': '__pus', 'value': 'pus-fake', 'domain': '.quark.cn', 'path': '/'},
        ])
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('  [console]', m.type, m.text[:200]))
        calls = []

        async def handler(route, request):
            u = request.url
            calls.append(request.method + ' ' + u.split('?')[0])
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
                body = {'status': 200, 'code': 0, 'data': {'total': 2, 'list': [
                    {'fid': 'f1001', 'file_name': '电影.mkv', 'size': 104857600, 'dir': False, 'updated_at': 1794600000},
                    {'fid': 'd2002', 'file_name': '相册', 'size': 0, 'dir': True, 'updated_at': 1794600000},
                ]}}
                return await route.fulfill(status=200, body=json.dumps(body), **cors)
            if '/1/clouddrive/file/download' in u:
                body = {'status': 200, 'code': 0, 'data': [
                    {'download_url': CDN, 'file_name': '电影.mkv', 'size': 104857600}
                ]}
                return await route.fulfill(status=200, body=json.dumps(body), **cors)
            if 'account/info' in u:
                return await route.fulfill(status=200, body=json.dumps(
                    {'success': True, 'code': 'OK', 'data': {'nickname': '测试夸克号'}}), **cors)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers={'access-control-allow-origin': 'https://pan.quark.cn'},
                                       body=HTML)

        await pg.route('https://pan.quark.cn/**', handler)
        await pg.route('https://drive-pc.quark.cn/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.quark.cn/list', wait_until='domcontentloaded')
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
          return [...sr.querySelectorAll('[data-fid]')].map(x => ({fid:x.dataset.fid, txt:x.textContent.trim().slice(0,30)}));
        }""")
        print('面板条目:', rows)
        await pg.screenshot(path=str(SHOT / 'quark_mine.png'))

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
          return {x: r.left + r.width/2, y: r.top + r.height/2, disabled: b.disabled};
        }""")
        print('复制按钮:', btn)
        if not btn['disabled']:
            await pg.mouse.click(btn['x'], btn['y'])
            await pg.wait_for_timeout(2500)
        copied = await pg.evaluate("() => (window.__copied||[]).slice(-2)")
        toasts = await pg.evaluate("() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; return [...sr.querySelectorAll('.toast')].map(t=>t.textContent); }")
        print('剪贴板:', copied)
        print('toast:', toasts)
        print('请求序列:', calls)
        await b.close()

asyncio.run(main())
