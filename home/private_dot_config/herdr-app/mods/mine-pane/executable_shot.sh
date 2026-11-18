#!/bin/sh
# Screenshot one pane: crop Herdr's own window shot to the pane, save it with the Mac's
# screenshots and copy it to the clipboard. Prints the saved path.
#   shot.sh X Y WIDTH            the pane header's bounds, in window points (from a click on it)
#   shot.sh --focused HEX WIDTH  the focused pane: found by its focus frame, a HEX-coloured line
#                                exactly WIDTH (+ border) wide
# The pane's height isn't known to the header, so the bottom edge is found in the image (see below).
set -eu
if [ "$1" = "--focused" ]; then MODE=focused; A=$2; W=$3; X=0; Y=0; else MODE=bounds; X=$1; Y=$2; W=$3; A=""; fi

dir=$(defaults read com.apple.screencapture location 2>/dev/null || echo "$HOME/Desktop")
dir=$(eval echo "$dir")
mkdir -p "$dir"
out="$dir/Herdr pane $(date '+%Y-%m-%d at %H.%M.%S').png"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

herdr-app shot "$tmp/window.png" >/dev/null
scale=$(osascript -l JavaScript -e 'ObjC.import("AppKit"); $.NSScreen.mainScreen.backingScaleFactor')
size=$(ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$tmp/window.png")

# Physical pixels; widen by the 1-point frame border on the left, top and right.
geom=$(python3 -I - "$X" "$Y" "$W" "$scale" "$size" "$tmp/window.png" "$MODE" "$A" <<'EOF'
import subprocess, sys
x, y, w, s = (float(v) for v in sys.argv[1:5])
iw, ih = (int(v) for v in sys.argv[5].split(","))
png, mode, accent = sys.argv[6], sys.argv[7], sys.argv[8]
if mode == "focused":
    # Find the focus frame's top edge: the topmost row with a run of the accent colour as long as
    # the frame's straight top (its width less the rounded corners), with no accent right above it.
    want = tuple(int(accent.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", png, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    hit = lambda o: abs(raw[o] - want[0]) + abs(raw[o + 1] - want[1]) + abs(raw[o + 2] - want[2]) <= 60
    lo, hi = (w + 2 - 32) * s, (w + 2) * s + 4
    found = None
    for row in range(ih):
        base, run = row * iw * 3, 0
        # Quick look first: every 8th pixel; a row without enough accent can't hold the frame.
        if sum(hit(base + c * 3) for c in range(0, iw, 8)) * 8 < lo * 0.9:
            continue
        for col in range(iw):
            if hit(base + col * 3):
                run += 1
                continue
            if lo <= run <= hi:
                mid = col - run // 2
                if row == 0 or not hit(base - iw * 3 + mid * 3):
                    found = (row, mid)
                    break
            run = 0
        if found:
            break
    if not found:
        sys.exit("no focused pane frame found")
    row, mid = found
    x, y = mid / s - (w + 2) / 2 + 1, row / s + 1
px, py, pw = round((x - 1) * s), round((y - 1) * s), round((w + 2) * s)
probe = round((x + 4) * s)  # inside the pane's left padding
def column(cx):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", png, "-vf", f"crop=1:{ih - py}:{cx}:{py}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True).stdout
    return [raw[i:i + 3] for i in range(0, len(raw), 3)]
def near(a, b):
    return sum(abs(p - q) for p, q in zip(a, b)) <= 24
# 1. Down the left margin (no text there) to where the pane's background ends: near the bottom,
#    but a little early, because the bottom-left corner is rounded.
left = column(probe)
start = round(44 * s)  # below the header
bg = left[start]
rough = next((i for i in range(start, len(left)) if not near(left[i], bg)), len(left))
# 2. In the middle the bottom border is straight: from just above that point, down through the
#    pane's background to the border line, then past it.
mid = column(round((x + w / 2) * s))
first = max(start, rough - round(4 * s))
line = next((i for i in range(first, len(mid)) if not near(mid[i], mid[first])), len(mid))
bottom = next((i for i in range(line, len(mid)) if not near(mid[i], mid[line])), len(mid))
ph = min(bottom, ih - py)
pw = min(pw, iw - px)
print(f"{pw}:{ph}:{px}:{py}")
EOF
)

ffmpeg -v error -y -i "$tmp/window.png" -vf "crop=$geom" "$out"
osascript -e "set the clipboard to (read (POSIX file \"$out\") as «class PNGf»)" >/dev/null
echo "$out"
