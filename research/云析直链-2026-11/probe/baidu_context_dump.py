import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-sandbox'])
        ctx=await b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
        pg=await ctx.new_page()
        await pg.goto('https://pan.baidu.com/s/1abcde', wait_until='domcontentloaded', timeout=35000)
        await pg.wait_for_timeout(3500)
        d=await pg.evaluate("""()=>{
          const g=(o,k)=>{try{return o&&o[k]}catch(e){return undefined}};
          let dump=null;
          try{ dump = window.locals && window.locals.dump ? window.locals.dump() : null }catch(e){ dump='ERR:'+e.message }
          return {
            hasLocals: !!window.locals,
            dumpKeys: dump? Object.keys(dump): null,
            bdstoken: dump&&dump.bdstoken? dump.bdstoken.value : null,
            share_uk: dump&&dump.share_uk? dump.share_uk.value : null,
            shareid: dump&&dump.shareid? dump.shareid.value : null,
            jsToken: window.jsToken||null,
            sekey: window.currentSekey||null,
            baiduid: (document.cookie.match(/BAIDUID=([^;]+)/)||[])[1]||null,
            yunData: typeof yunData!=='undefined'? Object.keys(yunData): null
          };
        }""")
        print(json.dumps(d, ensure_ascii=False, indent=1)[:900])
        await b.close()
asyncio.run(main())
