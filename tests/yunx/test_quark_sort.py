import asyncio, json, pathlib, tempfile
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
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
                # 故意按乱序返回，排序完全由脚本本地做
                lst = [
                    {'fid': 'f2', 'file_name': 'b.zip', 'size': 100, 'dir': False, 'updated_at': 3000},
                    {'fid': 'd1', 'file_name': '相册', 'size': 0, 'dir': True, 'updated_at': 5000},
                    {'fid': 'f1', 'file_name': 'a.mkv', 'size': 300, 'dir': False, 'updated_at': 1000},
                    {'fid': 'f3', 'file_name': 'c.txt', 'size': 200, 'dir': False, 'updated_at': 2000},
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
        await pg.wait_for_timeout(600)

        async def snap():
            return await pg.evaluate("""() => {
              const sr = document.getElementById('yunx-panlink-host').shadowRoot;
              const rows = [...sr.querySelectorAll('.row')].map(r => r.dataset.fid);
              const b = sr.getElementById('yx-sort');
              return {rows, label: b ? b.textContent : ''};
            }""")

        print('初始:', await snap())
        for i in range(6):
            await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-sort').click()")
            await pg.wait_for_timeout(250)
            s = await snap()
            print(f'点{i+1}下:', s)
        await pg.screenshot(path=str(SHOT / 'quark_sort.png'))

        final = await snap()
        # 六种排法循环一次后必须回到起点（名称 ↑），顺序与初始一致
        print('六种循环回到起点:', final['rows'] == ['d1', 'f1', 'f2', 'f3'] and final['label'] == '名称 ↑')
        await b.close()


asyncio.run(main())
