import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
import tempfile
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)
HTML = """<!doctype html><html><head><meta charset="utf-8"><title>夸克网盘</title></head><body>
<div>电影.mkv</div></body></html>"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 430, 'height': 900}, locale='zh-CN')
        await ctx.add_cookies([{'name': '__puus', 'value': 'puus-quark-fake', 'domain': '.quark.cn', 'path': '/'}])
        pg = await ctx.new_page()
        seen = []

        async def handler(route, request):
            u = request.url
            seen.append(u)
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
                if pdir == 'd2002':
                    lst = [{'fid': 'f3003', 'file_name': '相册里的图.jpg', 'size': 2048, 'dir': False}]
                else:
                    lst = [
                        {'fid': 'f1001', 'file_name': '电影.mkv', 'size': 104857600, 'dir': False},
                        {'fid': 'd2002', 'file_name': '相册', 'size': 0, 'dir': True},
                    ]
                return await route.fulfill(status=200, body=json.dumps(
                    {'status': 200, 'code': 0, 'data': {'list': lst}}), **cors)
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
        await pg.wait_for_timeout(700)
        print('初始:', await pg.evaluate("() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row')].map(x=>x.dataset.fid)"))

        # 页面自己切到 d2002（模拟用户点进相册，页面发 sort 请求）
        await pg.evaluate("""() => fetch('https://drive-pc.quark.cn/1/clouddrive/file/sort?pr=ucpro&fr=pc&pdir_fid=d2002&_page=1&_size=100').then(r=>r.text()).catch(()=>{})""")
        await pg.wait_for_timeout(4000)
        st = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const crumb = sr.getElementById('yx-crumb');
          return {rows: [...sr.querySelectorAll('.row')].map(x=>x.dataset.fid),
                  crumbShown: crumb ? crumb.style.display : 'n/a',
                  crumbText: crumb ? crumb.textContent.trim() : ''};
        }""")
        print('跟随结果:', st)
        print('sort 请求:', [x.split('?')[1][:60] for x in seen if 'file/sort' in x])
        await pg.screenshot(path=str(SHOT / 'quark_follow.png'))
        await b.close()

asyncio.run(main())
