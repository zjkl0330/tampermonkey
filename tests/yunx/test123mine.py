import asyncio, base64, json, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
import tempfile
SHOT = pathlib.Path(tempfile.gettempdir()) / 'yunx-shots'
SHOT.mkdir(parents=True, exist_ok=True)
CDN = 'https://cdn.123pan.example/down/f1'
tok = 'eyJhbGciOiJIUzI1NiJ9.fake-token-for-test-1234567890'
b64 = base64.b64encode(CDN.encode()).decode()

HTML = """<!doctype html><html><head><meta charset="utf-8"><title>我的云盘</title></head><body>
<div class="file-table">
  <div class="row_x1"><span class="ant-checkbox ant-checkbox-checked"><input type="checkbox" checked></span><span class="table-file-name">电影.mkv</span><span class="table-file-size">100 MB</span></div>
  <div class="row_x1"><span class="ant-checkbox"><input type="checkbox"></span><span class="table-file-name">相册</span><span class="table-file-size">-</span></div>
</div></body></html>"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 420, 'height': 900}, locale='zh-CN')
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('  [console]', m.type, m.text[:160]))
        calls = []

        async def handler(route, request):
            u = request.url
            calls.append(request.method + ' ' + u.split('?')[0])
            if u.endswith('/api/user/info'):
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'code':0,'data':{'Nickname':'测试号'}}))
            if '/api/file/list/new' in u:
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'code':0,'data':{'Next':'-1','Total':2,'InfoList':[
                    {'FileId':1,'FileName':'电影.mkv','Size':104857600,'Type':0,'Etag':'abc','S3KeyFlag':'s3k'},
                    {'FileId':2,'FileName':'相册','Size':0,'Type':1,'Etag':'','S3KeyFlag':''}]}}))
            if u.endswith('/api/file/download_info'):
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'code':0,'data':{'DownloadUrl':f'https://cdn.123pan.example/down/f1?params={b64}','FileName':'电影.mkv','Size':104857600}}))
            if u.startswith('https://cdn.123pan.example/'):
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'code':0,'data':{'redirect_url': CDN + '?sig=final'}}))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)

        await pg.route('https://yun.123pan.cn/**', handler)
        await pg.route('https://cdn.123pan.example/**', handler)
        await pg.add_init_script(script=f"try{{localStorage.setItem('accessToken', JSON.stringify('{tok}'))}}catch(e){{}}")
        await pg.add_init_script(script="window.__copied=[];const oe=document.execCommand&&document.execCommand.bind(document);document.execCommand=(c)=>{if(c==='copy'){const t=document.querySelector('textarea');if(t)window.__copied.push(t.value);}try{return oe?oe(c):false}catch(e){return false}}")
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://yun.123pan.cn/main', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3000)

        info = await pg.evaluate("""() => {
          const host = document.getElementById('yunx-panlink-host');
          if (!host || !host.shadowRoot) return {host:false};
          const sr = host.shadowRoot;
          const badge = sr.getElementById('yx-badge');
          return {host:true, badge: badge && badge.textContent, title: (sr.getElementById('yx-title')||{}).textContent, sub: (sr.getElementById('yx-sub')||{}).textContent};
        }""")
        print('挂载:', info)
        await pg.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()""")
        await pg.wait_for_timeout(700)
        rows = await pg.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          return [...sr.querySelectorAll('[data-fid]')].map(x => ({fid:x.dataset.fid, txt:x.textContent.trim().slice(0,24), sel:x.className.includes('sel')}));
        }""")
        print('面板条目:', rows)
        await pg.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-copy-sel').click()""")
        await pg.wait_for_timeout(2500)
        toast = await pg.evaluate("""() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.toast')].map(t=>t.textContent)""")
        print('提示:', toast)
        copied = await pg.evaluate("() => window.__copied")
        print('复制内容:', copied)
        print('请求:', calls)
        await pg.screenshot(path=str(SHOT / 'pan123mine.png'))
        await b.close()

asyncio.run(main())
