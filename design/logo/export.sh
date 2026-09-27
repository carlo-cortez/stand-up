#!/bin/sh
# Draw every PNG icon in public/ from design/logo/mark.svg.
#
# Uses macOS's own Quick Look renderer (qlmanage) and sips, so nothing needs
# installing. Run from anywhere:  sh design/logo/export.sh
#
# public/favicon.svg is kept by hand: at 16px the icon's face would be half
# a pixel wide, so the tab version draws the same deck with a face 2.5x larger.

set -eu
cd "$(dirname "$0")/../.."

MARK=design/logo/mark.svg
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# render NAME SIZE SCALE
#   SCALE shrinks the figure about the centre and leaves the tile full size.
render() {
  python3 - "$MARK" "$3" > "$WORK/$1.svg" <<'PY'
import re, sys
mark, scale = sys.argv[1], float(sys.argv[2])
s = open(mark).read()
s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
s = re.sub(r'<svg ', '<svg width="512" height="512" ', s, count=1)
if scale != 1:
    tile_end = s.index('/>', s.index('<rect')) + 2
    s = (s[:tile_end]
         + f'<g transform="translate(32 32) scale({scale}) translate(-32 -32)">'
         + s[tile_end:].replace('</svg>', '</g></svg>'))
print(s)
PY
  # Quick Look shrinks the drawing inside small thumbnails, so always render
  # at 512, where it is exact, and let sips scale down.
  qlmanage -t -s 512 -o "$WORK" "$WORK/$1.svg" >/dev/null 2>&1
  [ "$2" = 512 ] || sips -z "$2" "$2" "$WORK/$1.svg.png" >/dev/null
  mv "$WORK/$1.svg.png" "public/$1.png"
  echo "public/$1.png  $(sips -g pixelWidth "public/$1.png" | awk '/pixelWidth/ {print $2}')px"
}

# Full-bleed squares: iOS and Android round the corners themselves, and iOS
# fills transparent corners with black, so these must not be rounded here.
render apple-touch-icon 180 1
render icon-192 192 1
render icon-512 512 1

# Android crops maskable icons to a shape inside a circle of 40% radius. The
# face sits 23% from centre and the cards are meant to be cropped, so the
# icon goes in as it is.
render icon-maskable-512 512 1
