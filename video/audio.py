#!/usr/bin/env python3
"""Cut a supplied music track to the film: find the beat, start on a beat where the groove enters,
fade the tail, and lay typewriter key sounds under the typing. Writes the audio and a timing file
the film reads, so picture and sound share one clock.

  python3 video/audio.py track.wav out.wav timing.json [--beat 0.6] [--from 19.2] [--beats 52]
Standard library only. The track itself is not part of this repository."""
import json, math, random, struct, sys, wave

args = sys.argv[1:]
src, out, timing = args[0], args[1], args[2]
opt = dict(zip(args[3::2], args[4::2]))
BEAT = float(opt.get('--beat', 0.6)); FROM = float(opt.get('--from', 19.2)); BEATS = int(opt.get('--beats', 52))
TEXT = opt.get('--text', 'how a cache works')

w = wave.open(src); SR = w.getframerate(); CH = w.getnchannels()
assert w.getsampwidth() == 2 and CH == 2, 'expects 16-bit stereo WAV'

# --- beat phase: the grid offset that collects the most onsets in the 40 s after FROM
w.setpos(int(FROM * SR)); span = 40
raw = struct.unpack('<%dh' % (span * SR * 2), w.readframes(span * SR))
hop = 147                                                   # 300 Hz envelope
env = []
for i in range(0, span * SR - hop, hop):
    e = 0
    for j in range(i, i + hop, 3):
        v = raw[2 * j] + raw[2 * j + 1]; e += v * v
    env.append(math.log(1 + e))
on = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]
per = BEAT * SR / hop
best, phase = -1, 0.0
for k in range(int(per)):
    s = 0.0; x = float(k)
    while x < len(on) - 1:
        s += on[int(x)] + on[int(x) + 1]; x += per
    if s > best: best, phase = s, k * hop / SR
start = FROM + phase - 0.012                                  # a hair early so the hit is not clipped
DUR = BEATS * BEAT

# --- key timing: irregular, like someone typing; all inside beats 1 to 4.6
rnd = random.Random(7)
t, keys = 1.0 * BEAT, []
for c in TEXT:
    keys.append(round(t, 4))
    t += rnd.uniform(0.075, 0.135) + (0.085 if c == ' ' else 0) + (0.11 if rnd.random() < 0.12 else 0)
scale = min(1.0, (4.5 * BEAT - keys[0]) / (keys[-1] - keys[0]))
keys = [round(keys[0] + (k - keys[0]) * scale, 4) for k in keys]
enter = round(5.0 * BEAT, 4)

# --- cut the track
w.setpos(int(start * SR)); n = int(DUR * SR)
pcm = list(struct.unpack('<%dh' % (n * 2), w.readframes(n)))
L = [pcm[2 * i] / 32768 for i in range(n)]; R = [pcm[2 * i + 1] / 32768 for i in range(n)]
peak = max(max(map(abs, L)), max(map(abs, R))) or 1
g = 0.89 / peak
for i in range(n):
    t = i / SR
    f = min(1.0, t / 0.05) * min(1.0, (DUR - t) / 2.6)
    f = f * f * (3 - 2 * f)
    duck = 0.82 if t < enter + 0.25 else min(1.0, 0.82 + (t - enter - 0.25) * 0.6)   # leave room for the keys
    L[i] *= g * f * duck; R[i] *= g * f * duck

# --- typewriter: a short filtered click and a low thump per key; a heavier return with a small bell
def key(at, vel, pan, heavy=False):
    i0 = int(at * SR); r = random.Random(int(at * 1000)); prev = 0.0
    length = int((0.5 if heavy else 0.07) * SR)
    gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    for k in range(length):
        if i0 + k >= n: break
        t = k / SR
        nz = r.uniform(-1, 1); hp = nz - prev; prev = nz                       # crude high-pass
        v = 0.55 * hp * math.exp(-t * 320) + 0.5 * math.sin(2 * math.pi * (150 if heavy else 210) * t) * math.exp(-t * (38 if heavy else 85))
        if heavy: v += 0.16 * math.sin(2 * math.pi * 1975 * t) * math.exp(-t * 7) * min(1.0, t / 0.004)
        L[i0 + k] += v * vel * gl; R[i0 + k] += v * vel * gr
for i, k in enumerate(keys):
    if TEXT[i] != ' ': key(k, 0.20 + 0.05 * random.Random(i).random(), -0.25 + 0.5 * i / len(keys))
    else: key(k, 0.13, 0.0)
key(enter, 0.3, 0.0, heavy=True)

out_b = bytearray()
for i in range(n):
    out_b += struct.pack('<hh', int(max(-1, min(1, L[i])) * 32767), int(max(-1, min(1, R[i])) * 32767))
with wave.open(out, 'wb') as o:
    o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes(bytes(out_b))
json.dump({'beat': BEAT, 'beats': BEATS, 'duration': round(DUR, 4), 'text': TEXT, 'keys': keys, 'enter': enter, 'trackStart': round(start, 3)}, open(timing, 'w'), indent=1)
print('cut from %.3f s, %.1f s long, beat %.4f s, %d keys' % (start, DUR, BEAT, len(keys)))
