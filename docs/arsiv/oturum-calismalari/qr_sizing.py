# Deterministic QR sizing for candidate attendance payloads.
import sys, os, base64
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "pylib"))
import segno

def b32(b):  # RFC4648 base32, no padding -> QR alphanumeric-safe
    return base64.b32encode(b).decode().rstrip("=")

payloads = {
  "A HMAC-80 (ver1+sess8+slot4+mac10=23B)": bytes(23),
  "A' HMAC-96 (ver1+sess8+slot4+mac12=25B)": bytes(25),
  "B Ed25519 (ver1+sess8+slot4+sig64=77B)": bytes(77),
  "C ECDSA-P256 raw r||s (ver1+sess8+slot4+sig64=77B)": bytes(77),
}
BACK_ROW_M = [10, 15, 20, 25]
# Conservative rule: 10:1 distance:width for a version-2 code (25 modules)
# => module pitch >= distance/250. Required width = modules * d/250.
print("payload | encoding | chars | ECC | version | modules | width(m) needed at back row " + str(BACK_ROW_M) + " (no zoom) | with 2x zoom")
for name, raw in payloads.items():
    s = b32(bytes([0xA5]) + raw[1:])  # arbitrary non-zero bytes irrelevant for sizing
    for enc_name, data in (("base32 alnum", "IUA:" + s), ("raw bytes", raw)):
        for ecc in ("L", "M"):
            q = segno.make(data, error=ecc, micro=False, boost_error=False)
            n = q.symbol_size(border=0)[0]
            widths = [round(n * d / 250, 2) for d in BACK_ROW_M]
            zw = [round(w / 2, 2) for w in widths]
            print(f"{name} | {enc_name} | {len(data)} | {ecc} | {q.version} | {n} | {widths} | {zw}")
