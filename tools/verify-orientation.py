#!/usr/bin/env python3
"""Validate actual emulator screenshot dimensions from PNG IHDR without dependencies."""
from pathlib import Path
import struct
import sys


def dimensions(path):
    data = Path(path).read_bytes()[:24]
    if (len(data) != 24 or data[:8] != b'\x89PNG\r\n\x1a\n'
            or data[12:16] != b'IHDR'):
        raise ValueError(f'Invalid emulator screenshot: {path}')
    width, height = struct.unpack('>II', data[16:24])
    if not (0 < width <= 32768 and 0 < height <= 32768):
        raise ValueError(f'Invalid screenshot dimensions: {width}x{height}')
    return width, height


def verify(portrait, landscape):
    pw, ph = dimensions(portrait)
    lw, lh = dimensions(landscape)
    if not (pw < ph and lw > lh):
        raise ValueError(f'Orientation not applied: portrait={pw}x{ph}, landscape={lw}x{lh}')
    return f'PASS: portrait {pw}x{ph} and landscape {lw}x{lh}'


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Usage: verify-orientation.py portrait.png landscape.png')
    try:
        print(verify(sys.argv[1], sys.argv[2]))
    except (OSError, ValueError) as error:
        sys.exit(str(error))
