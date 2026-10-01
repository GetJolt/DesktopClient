"""Renders the app icon and installer artwork from the Jolt bolt mark.

Run from apps/desktop:  python scripts/generate-brand-assets.py
Needs Pillow. Outputs land in build/, which electron-builder picks up.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / 'build'
OUT.mkdir(exist_ok=True)

VOLT = (200, 240, 75)
VOLT_DARK = (20, 26, 4)
INK = (11, 11, 13)
INK_2 = (21, 21, 25)
FG = (242, 243, 246)
MUTED = (154, 158, 168)

# The bolt from the 32×32 logo SVG.
BOLT = [(18.2, 4.5), (8.6, 18), (14.7, 18), (13.1, 27.5), (23.4, 13.6), (17.1, 13.6)]
SS = 4  # supersampling for smooth edges


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    names = ['segoeuib.ttf', 'arialbd.ttf'] if bold else ['segoeui.ttf', 'arial.ttf']
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def logo(size: int, radius_ratio: float = 9 / 32) -> Image.Image:
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * radius_ratio), fill=VOLT)
    scale = big / 32
    draw.polygon([(x * scale, y * scale) for x, y in BOLT], fill=VOLT_DARK)
    return img.resize((size, size), Image.LANCZOS)


def glow(size: tuple[int, int], center: tuple[int, int], radius: int, strength: int) -> Image.Image:
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=(*VOLT, strength),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.55))


def backdrop(width: int, height: int, glow_at: tuple[int, int], glow_radius: int) -> Image.Image:
    img = Image.new('RGBA', (width, height), (*INK, 255))
    dots = ImageDraw.Draw(img)
    for y in range(0, height, 14):
        for x in range(0, width, 14):
            dots.point((x, y), fill=(255, 255, 255, 18))
    img.alpha_composite(glow((width, height), glow_at, glow_radius, 70))
    return img


# App icon: 1024 PNG for macOS/Linux, multi-size ICO for Windows.
icon = logo(1024, radius_ratio=0.225)
icon.save(OUT / 'icon.png')
icon.save(OUT / 'icon.ico', sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])

# NSIS welcome/finish sidebar (164×314) and header (150×57). NSIS wants 24-bit BMPs.
sidebar = backdrop(164, 314, (40, 70), 120)
sidebar.alpha_composite(logo(56), (24, 36))
draw = ImageDraw.Draw(sidebar)
draw.text((24, 104), 'Jolt', font=font(30), fill=FG)
draw.text((24, 142), 'Chat on servers', font=font(12, bold=False), fill=MUTED)
draw.text((24, 158), 'you can trust.', font=font(12, bold=False), fill=MUTED)
draw.line([(24, 290), (140, 290)], fill=(44, 46, 53))
sidebar.convert('RGB').save(OUT / 'installerSidebar.bmp')
sidebar.convert('RGB').save(OUT / 'uninstallerSidebar.bmp')

header = Image.new('RGBA', (150, 57), (255, 255, 255, 255))
header.alpha_composite(logo(34), (104, 11))
header.convert('RGB').save(OUT / 'installerHeader.bmp')

# macOS DMG window background, plus @2x.
for scale, name in ((1, 'background.png'), (2, 'background@2x.png')):
    w, h = 540 * scale, 380 * scale
    bg = backdrop(w, h, (int(w * 0.5), int(h * 0.12)), int(220 * scale))
    d = ImageDraw.Draw(bg)
    title = 'Drag Jolt into Applications'
    f = font(18 * scale)
    tw = d.textlength(title, font=f)
    d.text(((w - tw) / 2, 40 * scale), title, font=f, fill=FG)
    d.text((257 * scale, 186 * scale), '→', font=font(30 * scale), fill=MUTED)
    bg.convert('RGB').save(OUT / name)

print('Wrote brand assets to', OUT)
