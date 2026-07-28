#!/usr/bin/env python3
"""
FOOD DROP - Icon Generator Script
Tạo SVG icons cho PWA manifest
Chạy: python generate_icons.py
"""

import os
import struct
import zlib

# SVG template cho icon FOOD DROP
def make_svg(size):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#fb923c"/>
    </linearGradient>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ea6c0a"/>
      <stop offset="100%" style="stop-color:#f97316"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="{size}" height="{size}" rx="{size*0.22:.0f}" fill="url(#bg)"/>
  <!-- Inner shadow -->
  <rect x="4" y="4" width="{size-8}" height="{size-8}" rx="{size*0.19:.0f}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <!-- Noodle bowl emoji approximation using text -->
  <text x="{size//2}" y="{size//2 + size*0.12:.0f}" 
        font-size="{size*0.52:.0f}" 
        text-anchor="middle" 
        dominant-baseline="middle">🍜</text>
</svg>'''

def create_png_from_svg_data(size):
    """
    Tạo một PNG đơn giản (màu cam) thay thế cho SVG
    PNG header + IHDR + IDAT + IEND
    """
    # Màu nền: #f97316 (RGB: 249, 115, 22)
    r, g, b, a = 249, 115, 22, 255

    # PNG Signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (raw pixel data)
    raw_data = b''
    for y in range(size):
        raw_data += b'\x00'  # Filter type: None
        for x in range(size):
            # Rounded corners
            cx, cy = size // 2, size // 2
            radius = size * 0.78 / 2
            corner_r = size * 0.22
            
            # Simple circle check for rounded rect
            in_shape = True
            dx = abs(x - cx)
            dy = abs(y - cy)
            
            if dx > radius or dy > radius:
                in_shape = False
            
            if in_shape:
                raw_data += bytes([r, g, b])
            else:
                raw_data += bytes([0, 0, 0])
    
    compressed = zlib.compress(raw_data)
    idat = make_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = make_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

def make_chunk(chunk_type, data):
    chunk = chunk_type + data
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)

def generate_icons():
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    # Generate SVG files (for reference)
    for size in sizes:
        svg_path = os.path.join(icons_dir, f'icon-{size}.svg')
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(make_svg(size))
        print(f'✅ Created {svg_path}')
    
    # Generate simple PNG placeholders
    for size in sizes:
        png_path = os.path.join(icons_dir, f'icon-{size}.png')
        try:
            png_data = create_png_from_svg_data(size)
            with open(png_path, 'wb') as f:
                f.write(png_data)
            print(f'✅ Created {png_path} ({size}x{size})')
        except Exception as e:
            print(f'❌ Failed {png_path}: {e}')
    
    print(f'\n🎉 Generated {len(sizes)} icon sets in ./icons/')
    print('\n💡 TIP: Để có icon đẹp hơn, dùng tool như:')
    print('   - https://maskable.app/editor')
    print('   - https://realfavicongenerator.net')
    print('   - https://favicon.io/favicon-generator')

if __name__ == '__main__':
    generate_icons()
