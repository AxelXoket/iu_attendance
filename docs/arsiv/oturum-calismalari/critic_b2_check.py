"""Critic B2 deterministic checks on iu-yoklama-ozet.html (read-only)."""
import re, math, sys, html
from fractions import Fraction
path = sys.argv[1]
t = open(path, encoding="utf-8").read()
main = re.search(r"<main>(.*)</main>", t, re.S).group(1)
body = re.sub(r"<details.*?</details>", " ", main, flags=re.S)
def txt(h): return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h))).strip()
def wc(h): return len(txt(h).split())
print("words main body:", wc(body), "| appendices:", wc(main) - wc(body))
print("em dash:", t.count("—"), "en dash:", t.count("–"))
# per-section words (main body)
for sid, sec in re.findall(r'<section id="(\w+)"[^>]*>(.*?)</section>', body, re.S):
    print(f"  section {sid}: {wc(sec)}")
# long cells in main body
print("cells > 20 words (main body):")
for c in re.findall(r"<td[^>]*>(.*?)</td>", body, re.S):
    n = wc(c)
    if n > 20: print(f"  {n:3d}: {txt(c)[:90]}")
# Turkish filler words
tr_filler = ["kapsamlı", "sağlam", "kritik", "önemli", "oldukça", "temel", "zorunlu", "hayati", "son derece"]
for w in tr_filler:
    hits = [m.start() for m in re.finditer(w, txt(body), re.I)]
    if hits: print(f"filler '{w}': {len(hits)} in main body")
# glossary coverage: jargon used in main body vs glossary
gl = re.search(r"Ek D.*?</details>", main, re.S).group(0)
gl_terms = [txt(x).rstrip(":") for x in re.findall(r"<b>(.*?)</b>", gl)]
print("glossary terms:", gl_terms)
jargon = ["BLE", "P-256", "PWA", "EAS", "OTA", "MAU", "802.1X", "SUS", "VERBİS", "EBYS", "API 36", "Unlisted",
          "TestFlight", "SMTP", "IDFV", "ANDROID_ID", "App Attest", "Play Integrity", "pg_dump", "Docker Compose",
          "monorepo", "drizzle", "expo-sqlite", "SDK", "CVE", "CDN", "NFC", "eduroam", "ULAKBİM", "BİDB",
          "Güvenli Klasör", "root", "emülatör", "senkron", "UBYS", "AUZEF", "Better Auth", "Fastify", "Expo",
          "MAC", "BaaS", "Monotonik", "Secure Enclave", "EBYS", "tuzlu özeti", "Workspace", "passkey", "IMEI",
          "Compose MP", "Capacitor", "Supabase", "Appwrite", "PocketBase", "SheetJS", "write-excel-file", "exceljs",
          "Syncfusion", "blok ders", "şube", "kafa sayısı", "push", "veri işleyen", "OTP", "CameraX"]
bt, at = txt(body), txt(main)
for j in jargon:
    in_body = j.lower() in bt.lower(); in_gl = any(j.lower() == g.lower() for g in gl_terms)
    if in_body and not in_gl: print(f"  jargon in body, not in glossary: {j}")
    if in_gl and not in_body: print(f"  glossary term not used in main body: {j} (in appendices: {j.lower() in at.lower()})")
# faculty items keyword presence in whole doc
for k in ["tarih aralığ", "yıl/dönem", "dönem bazlı", "Capacitor", "Flutter web", "Syncfusion", "tek katılım",
          "registration", "kaydol", "kafa sayısı", "bölüm yöneticisi onay", "D-U-N-S", "yedek kod"]:
    print(f"  '{k}': body={k.lower() in bt.lower()} appendix={k.lower() in at.lower() and k.lower() not in bt.lower()}")
# float bug claim: hak = T - ceil(T*p/100), p=80, T in 1..199
bad = [T for T in range(1, 200) if math.ceil(T * 0.8) != math.ceil(Fraction(T * 80, 100))]
bad2 = [T for T in range(1, 200) if math.ceil(T * 80 / 100) != math.ceil(Fraction(T * 80, 100))]
print("float T*0.8 wrong count:", len(bad), "T=15:", 15 - math.ceil(15 * 0.8), "exact:", 15 - math.ceil(Fraction(12)))
print("float T*80/100 wrong count:", len(bad2))
bad70 = [T for T in range(1, 200) if math.ceil(T * 0.7) != math.ceil(Fraction(T * 70, 100))]
print("float T*0.7 wrong count:", len(bad70))
# data volume claim
print("50k students x 1/week x 28 weeks =", 50000 * 28, "; 8.4M/50k =", 8_400_000 / 50000, "sessions/student/yr")
print("4.2GB / 8.4M =", 4.2e9 / 8.4e6, "bytes/record")
from datetime import date
print("Bahar 25 Oca-30 Nis 2027 days:", (date(2027, 4, 30) - date(2027, 1, 25)).days)
print("Guz 14 Eyl-18 Ara 2026 days:", (date(2026, 12, 18) - date(2026, 9, 14)).days)
