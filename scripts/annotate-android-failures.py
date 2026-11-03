#!/usr/bin/env python3
"""Keep compiler/test/lint failures readable through GitHub's checks API too."""
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
if path.is_file():
    lines = path.read_text(errors="replace").splitlines()
    notable = [line for line in lines if re.search(r"^e: |FAILED|^\* What went wrong|^> (?!Task |Run with|Get more help)|^Script compilation|^  Line |error:|Error:|expected:|^Caused by:", line)]
    selected = notable[-35:] if notable else lines[-45:]
    for offset in range(0, len(selected), 10):
        message = "\n".join(selected[offset:offset + 10])[-8000:]
        message = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::error title=Android validation details::{message}")
