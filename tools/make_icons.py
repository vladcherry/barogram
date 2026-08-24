#!/usr/bin/env python3
"""Draw the PNG icons without any third-party dependency: same motif as
icon.svg — a few intensity scales plus a barogram line."""
import struct, zlib

BG = (11, 15, 20)
TRACK = (30, 39, 51)
BARS = [((53, 196, 106), 0.75), ((227, 199, 74), 0.50),
        ((240, 138, 60), 0.87), ((239, 91, 69), 0.31)]
LINE = (255, 255, 255)


def render(size):
    px = [[BG for _ in range(size)] for _ in range(size)]
    s = size / 512.0

    def rect(x, y, w, h, color):
        for yy in range(int(y * s), int((y + h) * s)):
            if 0 <= yy < size:
                for xx in range(int(x * s), int((x + w) * s)):
                    if 0 <= xx < size:
                        px[yy][xx] = color

    for i, (color, fill) in enumerate(BARS):
        y = 112 + i * 76
        rect(64, y, 384, 34, TRACK)
        rect(64, y, int(384 * fill), 34, color)

    pts = [(64, 420), (128, 400), (192, 432), (256, 396),
           (320, 424), (384, 388), (448, 412)]
    thick = max(2, int(14 * s))
    for a, b in zip(pts, pts[1:]):
        steps = max(1, int((b[0] - a[0]) * s))
        for t in range(steps + 1):
            k = t / steps
            x = int((a[0] + (b[0] - a[0]) * k) * s)
            y = int((a[1] + (b[1] - a[1]) * k) * s)
            for dy in range(-thick // 2, thick // 2 + 1):
                for dx in range(-thick // 2, thick // 2 + 1):
                    if dx * dx + dy * dy <= (thick // 2) ** 2:
                        if 0 <= y + dy < size and 0 <= x + dx < size:
                            px[y + dy][x + dx] = LINE
    return px


def write_png(path, px):
    size = len(px)
    raw = b''.join(b'\x00' + bytes(v for pixel in row for v in pixel) for row in px)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


for n in (192, 512):
    write_png('icons/icon-%d.png' % n, render(n))
    print('icons/icon-%d.png' % n)
