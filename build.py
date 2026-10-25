"""
build.py - make circuit-library.html: the Schematic Studio editor (vendor/schematic-studio.html, a copy of the
main program's editor) + this program's layer (app/*.js, app/app.css).

    python3 build.py                      # build circuit-library.html
    python3 build.py --vendor PATH        # first copy a newer editor from the main repo, then build
                                          #   (PATH = .../digital-fpga-ecosystem/schematic&bus2vhdl.html)
    python3 build.py --check              # fail if circuit-library.html is out of date

Never edit circuit-library.html by hand: it is overwritten.
"""
from __future__ import annotations
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENDOR = ROOT / "vendor" / "schematic-studio.html"
APP = ROOT / "app"
OUT = ROOT / "circuit-library.html"
HEAD_MARK, BODY_MARK = "<!-- CIRCUIT-LIBRARY:HEAD -->", "<!-- CIRCUIT-LIBRARY:APP -->"


def render() -> str:
    text = VENDOR.read_text(encoding="utf-8")
    head = (APP / "head.js").read_text(encoding="utf-8")
    css = (APP / "app.css").read_text(encoding="utf-8")
    js = "\n".join(p.read_text(encoding="utf-8") for p in sorted(APP.glob("[0-9]*.js")))
    i = text.index("<head>") + len("<head>")
    text = text[:i] + f"\n{HEAD_MARK}\n<script>\n{head}\n</script>\n" + text[i:]
    j = text.rindex("</body>")
    return text[:j] + f"{BODY_MARK}\n<style>\n{css}</style>\n<script>\n\"use strict\";\n{js}\n</script>\n" + text[j:]


def main() -> int:
    args = sys.argv[1:]
    if "--vendor" in args:
        src = Path(args[args.index("--vendor") + 1])
        shutil.copyfile(src, VENDOR)
        print(f"copied {src} -> {VENDOR}")
    out = render()
    if "--check" in args:
        ok = OUT.exists() and OUT.read_text(encoding="utf-8") == out
        print("circuit-library.html up to date" if ok else "circuit-library.html is stale: run python3 build.py")
        return 0 if ok else 1
    OUT.write_text(out, encoding="utf-8")
    print(f"built {OUT.name} ({OUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
