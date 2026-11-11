import base64
import collections
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

from Fat import write_files


class Qmp:
    def __init__(self, path):
        self.socket = socket.socket(socket.AF_UNIX)
        self.socket.settimeout(10)
        self.socket.connect(str(path))
        self.stream = self.socket.makefile("rwb", buffering=0)
        self.stream.readline()
        self.command("qmp_capabilities")

    def command(self, name, arguments=None):
        request = {"execute": name}
        if arguments:
            request["arguments"] = arguments
        self.stream.write((json.dumps(request) + "\n").encode())
        while True:
            line = self.stream.readline()
            if not line:
                raise RuntimeError("QEMU disconnected")
            response = json.loads(line)
            if "error" in response:
                raise RuntimeError(str(response["error"]))
            if "return" in response:
                return response["return"]

    def monitor(self, command):
        return self.command("human-monitor-command", {"command-line": command})

    def type(self, text):
        keys = {"\n": "ret", " ": "spc", "/": "slash", ":": "shift-semicolon",
                ";": "semicolon", '"': "shift-apostrophe", "#": "shift-3",
                ".": "dot", "_": "shift-minus"}
        for char in text:
            key = keys.get(char, "shift-" + char.lower() if char.isupper() else char)
            self.monitor("sendkey " + key + " 10")
            time.sleep(0.03)


def screen_text(path, font):
    data = path.read_bytes()
    header = re.match(rb"P6\s+(\d+)\s+(\d+)\s+255\s", data)
    if not header:
        raise RuntimeError("Unexpected QEMU screenshot format")
    width, height = map(int, header.groups())
    pixels = memoryview(data)[header.end():]
    glyphs = {font[ch * 8:ch * 8 + 8]: chr(ch) for ch in range(32, 127)}
    lines = []
    for y in range(0, height - 7, 8):
        line = ""
        for x in range(0, width - 7, 8):
            cell = [bytes(pixels[((y + row) * width + x + col) * 3:]
                          [:3]) for row in range(8) for col in range(8)]
            background = collections.Counter(cell).most_common(1)[0][0]
            bits = bytes(sum((cell[row * 8 + col] != background) << col
                             for col in range(8)) for row in range(8))
            line += glyphs.get(bits, " ")
        lines.append(line)
    return "\n".join(lines)


def run(config):
    cache = Path(config["cache"])
    accelerator = config.get("accelerator", "kvm" if os.access("/dev/kvm", os.R_OK | os.W_OK) else "tcg")
    if accelerator not in ("kvm", "tcg"):
        raise ValueError("Oracle accelerator must be kvm or tcg")
    executable = shutil.which("qemu-system-x86_64")
    if not executable:
        raise RuntimeError("qemu-system-x86_64 is required for the independent oracle")
    version = subprocess.check_output([executable, "--version"], text=True).splitlines()[0]
    work = Path(tempfile.mkdtemp(prefix="qemu-", dir=cache))
    image = work / "guest.raw"
    log = work / "debug.log"
    ppm = work / "screen.ppm"
    files = {item["name"]: base64.b64decode(item["bytes"]) for item in config["files"]}
    write_files(cache / "templeos.raw", image, files)
    font_source = (cache / "web/holyc-wasm/src/runtime/font.js").read_text()
    font = base64.b64decode(re.search(r'const B64 = "([^"]+)"', font_source)[1])
    with tempfile.TemporaryDirectory(prefix="tos-qmp-") as transport:
        qmp_path = Path(transport) / "qmp.sock"
        command = [executable, "-machine", "pc", "-accel", accelerator,
                   "-cpu", "host" if accelerator == "kvm" else "max", "-m", "384M", "-smp", "1",
                   "-drive", f"file={image},format=raw,if=ide,index=0,snapshot=on",
                   "-vga", "std", "-display", "none", "-qmp",
                   f"unix:{qmp_path},server=on,wait=off", "-debugcon", f"file:{log}"]
        with open(work / "qemu.log", "wb") as errors:
            process = subprocess.Popen(command, stdout=errors, stderr=errors)
            qmp = None
            deadline = time.monotonic() + config.get("timeout", 180)

            def wait(predicate, reason):
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        raise RuntimeError(f"QEMU exited {process.returncode}: {work / 'qemu.log'}")
                    if predicate():
                        return
                    time.sleep(0.15)
                raise TimeoutError(f"Timed out waiting for {reason}; evidence: {work}")

            def desktop():
                qmp.command("screendump", {"filename": str(ppm)})
                text = screen_text(ppm, font)
                (work / "screen.txt").write_text(text)
                return text

            try:
                wait(lambda: qmp_path.exists(), "QMP socket")
                qmp = Qmp(qmp_path)

                def boot_menu():
                    path = work / "vga.bin"
                    qmp.monitor(f'pmemsave 0xb8000 4000 "{path}"')
                    return b"Selection:" in path.read_bytes()[::2]

                wait(boot_menu, "TempleOS boot selection")
                qmp.type("1\n")
                wait(lambda: "Take Tour(y or n)?" in desktop(), "TempleOS shell")
                time.sleep(0.5)
                qmp.monitor("sendkey ctrl-alt-t 10")
                time.sleep(0.5)
                qmp.type('#include "C:/ORACLE/RUN.HC";\n')
                def fixtures_done():
                    if not log.exists():
                        return False
                    data = log.read_bytes()
                    fault = re.search(rb"(?:^|\n)Fault:0x[0-9A-Fa-f]+[^\n]*", data)
                    if fault:
                        raise RuntimeError(f"Native CPU {fault[0].strip().decode('latin1')}; evidence: {work}")
                    return b"\x04" in data

                wait(fixtures_done, "native fixtures")
                data = log.read_bytes()
                results = []
                for number in range(config["count"]):
                    start = (f"\x1e{number}:B\x1f").encode()
                    end = re.compile((f"\x1e{number}:E:([0-9A-F]+)\x1f").encode())
                    first = data.find(start)
                    last = end.search(data, first + len(start))
                    if first < 0 or not last:
                        raise RuntimeError(f"Missing fixture {number} output: {log}")
                    exception = int(last[1], 16).to_bytes(8, "little").rstrip(b"\0").decode("latin1")
                    results.append({"out": data[first + len(start):last.start()].decode("latin1"),
                                    "except": exception})
                return {"results": results, "backend": {"engine": "qemu", "accelerator": accelerator,
                        "version": version}, "evidence": str(work)}
            finally:
                if process.poll() is None:
                    try:
                        if qmp:
                            qmp.command("quit")
                    except (OSError, RuntimeError):
                        pass
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                image.unlink(missing_ok=True)


if __name__ == "__main__":
    print(json.dumps(run(json.load(sys.stdin))))
