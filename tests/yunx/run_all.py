#!/usr/bin/env python3
"""云析直链 · 本地冒烟测试

每个用例都是一个独立的 Playwright 脚本：伪造一个网盘页面、把接口用
`page.route` 打桩，然后把 userscript 注入进去，最后断言面板上的可见结果。

用法：
    python3 tests/yunx/run_all.py            # 全跑
    python3 tests/yunx/run_all.py --offline  # 跳过要真连 GitHub 的用例
    python3 tests/yunx/run_all.py quark      # 只跑名字里带 quark 的

依赖：
    pip install playwright && python3 -m playwright install chromium
"""
import subprocess
import sys
import pathlib

HERE = pathlib.Path(__file__).resolve().parent

# 用例 -> 输出里必须出现的关键串。少一个就算失败。
# 这些串都是「用户能看到的结果」或「关键请求确实发了」，不是内部日志。
CASES = {
    'test_quark_mine.py':   ['测试夸克号', '已复制 1 条', '/1/clouddrive/file/download'],
    'test_quark_share.py':  ['朋友的夸克分享', '已复制直链'],
    'test_quark_follow.py': ['f3003', '页面所在目录'],
    'test_quark_batch.py':  ['已加入下载队列 2 个', 'down/f1', 'down/f2'],
    'test_quark_dir_dl.py': ['down/f2', 'down/f3', "'0', 'd1', 'd2'"],
    'test_quark_sort.py':   ['六种循环回到起点: True', '大小 ↓', '时间 ↓'],

    'test_uc_mine.py':      ['测试UC号', '已复制 1 条'],
    'test_uc_share.py':     ['已复制直链', 'transfer_share/detail'],
    'test_uc_follow2.py':   ['f9010'],

    'test123mine.py':       ['已复制 1 条', 'download_info'],
    'test123share.py':      ['朋友的分享', 'share/get'],
    'test123follow.py':     ['页面所在目录'],

    'test_ct_mine.py':      ['已复制 1 条', 'direct-link', '"rotate_token":false'],
    'test_ct_edge.py':      ['登录失效', 'altcha'],
    'test_ct_follow.py':    ['f7002', '页面所在目录'],

    'test_xl_mine.py':      ['已复制 1 条', 'captcha/init'],
    'test_xl_share.py':     ['分享文件.zip'],
    'test_xl_edge.py':      ['读不到登录令牌', '登录失效'],
    'test_xl_follow.py':    ['333'],

    'test_bd_mine.py':      ['[ok] 复制', '登录失效'],
    'test_bd_noauth.py':    ['未授权', "'authBtn': True"],
}

# 需要真实访问 GitHub 的用例，断网 / CI 里跳过
ONLINE = {
    'test_update.py':   ['已是最新'],
    'test_fallback.py': ['已是最新版本'],
}


def run(name, expects):
    path = HERE / name
    try:
        p = subprocess.run([sys.executable, str(path)], capture_output=True, text=True, timeout=240)
    except subprocess.TimeoutExpired:
        return False, '超时（240s）', ''
    out = (p.stdout or '') + (p.stderr or '')
    missing = [e for e in expects if e not in out]
    if p.returncode != 0:
        return False, f'退出码 {p.returncode}', out
    if missing:
        return False, '缺少关键字：' + ' / '.join(missing), out
    return True, 'ok', out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    offline = '--offline' in sys.argv

    cases = dict(CASES)
    if not offline:
        cases.update(ONLINE)

    if args:
        cases = {k: v for k, v in cases.items() if any(a in k for a in args)}

    total = len(cases)
    failed = []
    print(f'跑 {total} 个用例{"（离线模式）" if offline else ""}\n')
    for name, expects in cases.items():
        ok, why, out = run(name, expects)
        print(f'{"PASS" if ok else "FAIL"}  {name}' + ('' if ok else f'   ← {why}'))
        if not ok:
            failed.append((name, why, out))

    print()
    if failed:
        print(f'{len(failed)} 个失败：')
        for name, why, out in failed:
            print(f'\n===== {name} · {why}')
            print('\n'.join(out.strip().splitlines()[-25:]))
        return 1
    print(f'全部通过（{total}/{total}）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
