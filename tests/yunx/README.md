# 云析直链 · 冒烟测试

这套用例是给 `js/云析直链.user.js` 用的**回归网**。每个 `.py` 是一个独立场景：
用 Playwright 伪造一个网盘页面、把接口用 `page.route` 全部打桩，再把 userscript
注入进去，最后断言面板上真正显示出来的东西（标题、标签、行、toast、请求序列）。

不打真实网盘接口，所以断网也能跑，也不会碰你的账号。

## 怎么跑

```bash
pip install playwright
python3 -m playwright install chromium

python3 tests/yunx/run_all.py            # 全跑（含 2 个需要联网的更新检查）
python3 tests/yunx/run_all.py --offline  # 跳过联网用例，CI 用这个
python3 tests/yunx/run_all.py quark      # 只跑名字里带 quark 的
```

单个用例也能直接跑，输出是给人看的：

```bash
python3 tests/yunx/test_quark_mine.py
```

截图落在系统临时目录的 `yunx-shots/` 下。

## 覆盖了什么

| 平台 | 用例 |
| --- | --- |
| 夸克 | 个人盘挂载 / 取链、分享页、目录跟随、批量下载 |
| UC | 个人盘、分享页、目录跟随（不换 URL 的 SPA） |
| 123 | 个人盘、分享页、`parentFileId` 跟随 |
| 城通 | 个人盘、免费号直链被拒后回退分享解析、`#folder=` 跟随 |
| 迅雷 | 个人盘、分享页、未登录 / 登录失效、`parent_id` 跟随 |
| 百度 | 个人盘、令牌失效、未授权（一键授权按钮） |
| 通用 | 更新检查四源回退、分片引擎降级 |

## 加用例的规矩

1. 一个场景一个文件，命名 `test_<平台>_<场景>.py`。
2. 只打桩外部接口，不要让脚本真的访问外网。
3. 断言「用户看得到的」——面板文案、行 fid、toast、发出去的请求路径；
   不要断言内部变量名，否则重构一次就红一片。
4. 断言关键字写进 `run_all.py` 的 `CASES` 表，`run_all.py` 靠它判成败。

> 这套东西存在的理由很实际：个人盘那几家平台的接口是靠反推线上前端 chunk 得来的，
> 对方改一个参数名脚本就静默失效。没有回归网，每次改动都是裸奔。
