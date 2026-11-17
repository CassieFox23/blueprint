#!/usr/bin/env python3
"""Compose the teaser's background music: 30 s, soft felt-piano arpeggios over a warm pad.
Pure standard library, original material.   python3 video/music.py out.wav"""
import math, struct, sys, wave
from array import array

SR, DUR = 44100, 30.0
N = int(SR * DUR)
L, R = array('d', bytes(8 * N)), array('d', bytes(8 * N))
TAU = 2 * math.pi

def hz(note):                      # 'D3' -> frequency
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    n, rest = names[note[0]], note[1:]
    if rest[0] == '#': n += 1; rest = rest[1:]
    return 440.0 * 2 ** ((n - 9) / 12 + int(rest) - 4)

def add(start, length, fn, pan):   # fn(t) -> sample; equal-power pan in [-1, 1]
    a = (pan + 1) * math.pi / 4
    gl, gr = math.cos(a), math.sin(a)
    i0 = int(start * SR)
    for i in range(max(0, i0), min(N, i0 + int(length * SR))):
        v = fn((i - i0) / SR)
        L[i] += v * gl; R[i] += v * gr

def piano(start, f, vel, pan):     # felt piano: few soft partials, quick attack, long decay
    w = TAU * f
    def fn(t):
        env = min(1.0, t / 0.012) * math.exp(-t * 1.5)
        return vel * env * (math.sin(w * t) + 0.32 * math.exp(-t * 3) * math.sin(2 * w * t) + 0.1 * math.exp(-t * 5) * math.sin(3 * w * t))
    add(start, 3.6, fn, pan)

def pad(start, length, f, vel, pan):   # two slightly detuned sines, slow swell
    w1, w2 = TAU * f * 0.9985, TAU * f * 1.0015
    def fn(t):
        env = min(1.0, t / 1.6) * min(1.0, (length - t) / 1.8)
        return vel * env * 0.5 * (math.sin(w1 * t) + math.sin(w2 * t))
    add(start, length, fn, pan)

# D major, one chord every 4 s (cuts in the film fall on even seconds)
CHORDS = [
    ('D2',  ['D3', 'A3', 'F#4', 'A4', 'C#5', 'A4', 'F#4', 'A3']),   # Dmaj7
    ('B1',  ['B2', 'F#3', 'D4', 'F#4', 'A4', 'F#4', 'D4', 'F#3']),  # Bm7
    ('G1',  ['G2', 'D3', 'B3', 'D4', 'F#4', 'D4', 'B3', 'D3']),     # Gmaj7
    ('A1',  ['A2', 'E3', 'B3', 'E4', 'G4', 'E4', 'B3', 'E3']),      # A9
    ('D2',  ['D3', 'A3', 'F#4', 'A4', 'D5', 'A4', 'F#4', 'A3']),
    ('B1',  ['B2', 'F#3', 'D4', 'F#4', 'B4', 'F#4', 'D4', 'F#3']),
    ('G1',  ['G2', 'D3', 'B3', 'D4', 'A4', 'D4', 'B3', 'D3']),
    ('D2',  ['D3', 'A3', 'F#4', 'A4'])                               # home, let it ring
]
for c, (bass, arp) in enumerate(CHORDS):
    t0 = c * 4.0
    if t0 >= DUR: break
    pad(t0 - 0.6, 5.6, hz(bass), 0.20, 0.0)
    pad(t0 - 0.6, 5.6, hz(arp[0]) , 0.12, -0.25)
    pad(t0 - 0.6, 5.6, hz(arp[2]), 0.09, 0.3)
    for k, n in enumerate(arp):
        t = t0 + k * 0.5 + (0.012 if k % 2 else 0)          # a touch of human timing
        if t > DUR - 1.2: break
        vel = (0.30 if k == 0 else 0.20) * (0.85 + 0.15 * math.sin(k * 1.7 + c))
        piano(t, hz(n), vel * (0.55 if c == 0 and k < 2 else 1), -0.45 + 0.9 * ((k * 3) % 8) / 7)

# room: three feedback delays, cross-fed, for a soft tail
def reverb(a, b):
    for d, g in ((0.113, 0.34), (0.171, 0.28), (0.241, 0.22)):
        n = int(d * SR)
        for i in range(n, N):
            a[i] += g * 0.5 * (a[i - n] + b[i - n]) * 0.62
reverb(L, R); reverb(R, L)

peak = max(max(abs(x) for x in L), max(abs(x) for x in R))
g = 0.62 / peak
out = bytearray()
for i in range(N):
    t = i / SR
    f = min(1.0, t / 0.8) * min(1.0, (DUR - t) / 3.2)        # fade in, long fade out
    f = f * f * (3 - 2 * f)
    out += struct.pack('<hh', int(L[i] * g * f * 32767), int(R[i] * g * f * 32767))
path = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(out))
print('wrote', path)
