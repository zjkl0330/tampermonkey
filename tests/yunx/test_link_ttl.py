import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div class="list"><div>电影.mkv</div></div></body></html>"""

CDN = 'https://cdn.quark.example/down/'

# 2026-01-01T00:00:00Z，方便用固定时间点推进
T0 = 1767225600000
MIN16 = 16 * 60 * 1000


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()
        n = {'dl': 0}

        await pg.add_init_script(script="""
          window.__copied = [];
          document.execCommand = function (cmd) {
            if (cmd === 'copy') {
              const ta = document.querySelector('textarea');
              if (ta) window.__copied.push(ta.value);
              return true;
            }
            return false;
          };
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
                lst = [{'fid': 'f1', 'file_name': '电影.mkv', 'size': 1024, 'dir': False}]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': lst}}), **cors)
            if '/1/clouddrive/file/download' in u:
                n['dl'] += 1
                out = [{'download_url': CDN + 'f1?n=' + str(n['dl']), 'file_name': '电影.mkv', 'size': 1024}]
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
        # 固定系统时间，后面用 set_system_time 推进 16 分钟来触发 TTL
        await pg.clock.set_system_time(T0)
        await pg.goto('https://pan.quark.cn/list', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)

        async def click_copy():
            pos = await pg.evaluate("""() => {
              const sr = document.getElementById('yunx-panlink-host').shadowRoot;
              const b = sr.querySelector('[data-act=copy]');
              if (!b) return null;
              const r = b.getBoundingClientRect();
              return {x: r.left + r.width/2, y: r.top + r.height/2};
            }""")
            if not pos:
                print('没有复制按钮')
                return
            await pg.mouse.click(pos['x'], pos['y'])
            await pg.wait_for_timeout(1500)

        await click_copy()
        print('第一次复制后，取链请求数:', n['dl'])
        await click_copy()
        print('第二次复制后（应命中缓存）:', n['dl'])

        # 推进 16 分钟，超过 15 分钟 TTL
        await pg.clock.set_system_time(T0 + MIN16)
        await click_copy()
        print('推进 16 分钟后再复制（应重新取链）:', n['dl'])

        copied = await pg.evaluate("() => window.__copied")
        print('剪贴板条数:', len(copied))
        print('链接序号:', [c.split('n=')[-1].split()[0] if 'n=' in c else '?' for c in copied])
        print('缓存后重取:', n['dl'] == 2)
        await pg.screenshot(path=str(SHOT / 'quark_link_ttl.png'))
        await b.close()

asyncio.run(main())
