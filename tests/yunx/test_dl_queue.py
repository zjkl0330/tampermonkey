import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div class="list"></div></body></html>"""

CDN = 'https://cdn.quark.example/down/'
SIZE = 8 * 1024 * 1024
NF = 6          # 6 个文件，并发上限 3 → 应有 3 个在跑、3 个排队

FILES = [{'fid': 'f%d' % i, 'file_name': '%d.bin' % i, 'size': SIZE, 'dir': False} for i in range(1, NF + 1)]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('  [console]', m.type, m.text[:220]))
        pg.on('pageerror', lambda e: print('  [pageerror]', str(e)[:300]))
        reqs = []

        async def handler(route, request):
            u = request.url
            cors = {
                'access-control-allow-origin': 'https://pan.quark.cn',
                'access-control-allow-credentials': 'true',
                'access-control-allow-headers': '*',
                'access-control-allow-methods': '*',
                'access-control-expose-headers': 'content-range, accept-ranges, content-length, content-type',
            }
            reqs.append(request.method + ' ' + u.split('?')[0])
            if 'cdn.quark.example' in u:
                rng = request.headers.get('range') or ''
                if request.method == 'HEAD':
                    h = dict(cors, **{
                        'content-type': 'application/octet-stream',
                        'content-length': str(SIZE),
                        'accept-ranges': 'bytes',
                    })
                    return await route.fulfill(status=200, headers=h, body='')
                await asyncio.sleep(3)   # 慢一点，才能看到「在跑 / 排队」的分界
                start = 0
                if rng.startswith('bytes='):
                    start = int(rng.split('=')[1].split('-')[0] or 0)
                end = min(SIZE - 1, start + 1024 * 1024 - 1)
                h = dict(cors, **{
                    'content-type': 'application/octet-stream',
                    'content-length': str(end - start + 1),
                    'content-range': 'bytes %d-%d/%d' % (start, end, SIZE),
                    'accept-ranges': 'bytes',
                })
                return await route.fulfill(status=206, headers=h, body=b'x' * (end - start + 1))
            if '/1/clouddrive/file/sort' in u:
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': FILES}}),
                    content_type='application/json', headers=cors)
            if '/1/clouddrive/file/download' in u:
                body = json.loads(request.post_data or '{}')
                fids = body.get('fids') or ['x']
                out = [{'download_url': CDN + f, 'file_name': f + '.bin', 'size': SIZE} for f in fids]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': out}),
                    content_type='application/json', headers=cors)
            if 'account/info' in u:
                return await route.fulfill(status=200, body=json.dumps(
                    {'success': True, 'data': {'nickname': '测试夸克号'}}),
                    content_type='application/json', headers=cors)
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8',
                                       headers=cors, body=HTML)

        await pg.route('https://pan.quark.cn/**', handler)
        await pg.route('https://drive-pc.quark.cn/**', handler)
        await pg.route('https://cdn.quark.example/**', handler)
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.quark.cn/list', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)

        # 强制走分片引擎，默认 auto 在无 GM 环境下会退化成「交给浏览器」
        await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const dm = sr.getElementById('yx-dl-mode');
          dm.value = 'engine';
          dm.dispatchEvent(new Event('change'));
        }""")

        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-select-all').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-dl-sel').click()")

        # 取链串行（600ms 一个）+ probe，给足时间进入「3 跑 3 排」的稳定态
        await pg.wait_for_timeout(9000)
        stat = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const btns = [...sr.querySelectorAll('[data-act=dl]')].map(b => b.textContent.trim());
          return {
            status: (sr.getElementById('yx-status')||{}).textContent,
            run: btns.filter(t => t === '暂停').length,
            queued: btns.filter(t => t === '排队').length,
            labels: btns,
          };
        }""")
        print('状态栏:', stat['status'])
        print('按钮:', stat['labels'])
        print('在跑:', stat['run'], '排队:', stat['queued'])
        print('请求:', reqs[:14])
        toasts = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('.toast')].map(t=>t.textContent);
        }""")
        print('toast:', toasts)
        print('并发不超过 3:', stat['run'] <= 3)
        print('确实有排队:', stat['queued'] >= 1)
        await pg.screenshot(path=str(SHOT / 'quark_dl_queue.png'))
        await b.close()

asyncio.run(main())
