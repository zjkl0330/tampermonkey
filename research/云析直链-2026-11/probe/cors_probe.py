import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-sandbox'])
        ctx=await b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
        pg=await ctx.new_page()
        await pg.goto('https://pan.xunlei.com/s/VOn6f4FsZ0dz6iys2DgrGAZnA1?pwd=jzv5', wait_until='domcontentloaded', timeout=35000)
        await pg.wait_for_timeout(4000)
        out=await pg.evaluate("""async ()=>{
          try{
            const r=await fetch('https://api-pan.xunlei.com/drive/v1/share?share_id=VOn6f4FsZ0dz6iys2DgrGAZnA1&pass_code=jzv5&limit=30&page_token=',
              {headers:{'x-captcha-token':'ck0.invalid','x-device-id':'78a70629a2b17d0b4302317ffa94807a','x-client-id':'Xqp0kJBXWhwaTpB6'}});
            return 'status='+r.status+' '+(await r.text()).slice(0,180);
          }catch(e){return 'THROW '+e.message}
        }""")
        print('XUNLEI CORS:', out)
        pg2=await ctx.new_page()
        await pg2.goto('https://pan.baidu.com/s/1abcde', wait_until='domcontentloaded', timeout=30000)
        await pg2.wait_for_timeout(2500)
        out2=await pg2.evaluate("""async ()=>{
          try{
            const r=await fetch('https://pan.baidu.com/rest/2.0/xpan/share?method=list&shorturl=1abcde&page=1&num=10&root=1&dir=%2F',{credentials:'include'});
            return 'status='+r.status+' '+(await r.text()).slice(0,200);
          }catch(e){return 'THROW '+e.message}
        }""")
        print('BAIDU SAMEORIGIN:', out2)
        await b.close()
asyncio.run(main())
