#!/usr/bin/env python3
"""Generate BMP assets for the i-thinking NSIS installer (no Pillow required)."""

from __future__ import annotations

import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent / "assets"

PRIMARY = (0x40, 0x80, 0xFF)
PRIMARY_DARK = (0x1A, 0x56, 0xE8)
WHITE = (255, 255, 255)
SOFT = (0xF5, 0xF8, 0xFF)


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def write_bmp(path: Path, width: int, height: int, pixels: list[tuple[int, int, int]]) -> None:
    row_pad = (4 - (width * 3) % 4) % 4
    data = bytearray()
    for y in range(height - 1, -1, -1):
        for x in range(width):
            r, g, b = pixels[y * width + x]
            data += bytes((b, g, r))
        data += b"\x00" * row_pad
    file_size = 54 + len(data)
    header = struct.pack("<2sIHHI", b"BM", file_size, 0, 0, 54)
    dib = struct.pack("<IiiHHIIiiII", 40, width, height, 1, 24, 0, len(data), 2835, 2835, 0, 0)
    path.write_bytes(header + dib + data)
    print(f"wrote {path.name} ({width}x{height})")


def make_logo(size: int = 96) -> list[tuple[int, int, int]]:
    pixels: list[tuple[int, int, int]] = []
    cx = cy = size / 2
    radius = size * 0.42
    for y in range(size):
        for x in range(size):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            distance = math.hypot(dx, dy)
            if distance > radius + 1.5:
                pixels.append(WHITE)
            elif distance > radius - 0.5:
                t = (distance - (radius - 0.5)) / 2.0
                pixels.append(lerp(PRIMARY, WHITE, t))
            else:
                t = distance / radius
                base = lerp(PRIMARY_DARK, PRIMARY, t * 0.55)
                nx, ny = (x - cx) / radius, (y - cy) / radius
                in_stem = abs(nx) < 0.12 and -0.08 < ny < 0.38
                in_dot = abs(nx) < 0.12 and -0.42 < ny < -0.22
                pixels.append(WHITE if in_stem or in_dot else base)
    return pixels


def make_welcome(width: int = 164, height: int = 314) -> list[tuple[int, int, int]]:
    pixels: list[tuple[int, int, int]] = []
    orbs = (
        (0.22, 0.18, 0.35, WHITE),
        (0.78, 0.55, 0.28, (0x7A, 0xB0, 0xFF)),
        (0.35, 0.82, 0.40, (0x00, 0xC8, 0x53)),
    )
    for y in range(height):
        for x in range(width):
            t = y / (height - 1)
            color = lerp((0x9B, 0xC2, 0xFF), PRIMARY_DARK, t * 0.85 + (x / width) * 0.15)
            for ox, oy, orad, oc in orbs:
                d = math.hypot(x / width - ox, y / height - oy) / orad
                if d < 1:
                    color = lerp(color, oc, (1 - d) ** 2 * 0.22)
            streak = abs((x / width) + (y / height) * 0.35 - 0.55)
            if streak < 0.03:
                color = lerp(color, WHITE, (0.03 - streak) / 0.03 * 0.18)
            pixels.append(color)
    return pixels


def make_header(width: int = 150, height: int = 57) -> list[tuple[int, int, int]]:
    pixels: list[tuple[int, int, int]] = []
    for y in range(height):
        for x in range(width):
            if y < 3:
                pixels.append(PRIMARY)
            else:
                t = 1 - y / (height - 1)
                pixels.append(lerp(WHITE, SOFT, t * 0.35))
    cx, cy, radius = 28, 30, 14
    for y in range(height):
        for x in range(width):
            d = math.hypot(x - cx, y - cy)
            if d <= radius:
                pixels[y * width + x] = PRIMARY
            if d <= radius * 0.35:
                pixels[y * width + x] = WHITE
    return pixels


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_bmp(OUT / "logo.bmp", 96, 96, make_logo(96))
    write_bmp(OUT / "welcome.bmp", 164, 314, make_welcome())
    write_bmp(OUT / "header.bmp", 150, 57, make_header())
    print("done")


if __name__ == "__main__":
    main()
