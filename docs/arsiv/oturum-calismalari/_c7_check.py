from datetime import date, timedelta as td
for s in ["2027-01-13","2027-01-20","2027-01-25","2027-03-11","2026-12-21","2026-12-15","2027-04-10","2027-05-01","2027-05-02","2027-04-30"]:
    d=date.fromisoformat(s); print(s, d.strftime("%a"))
print("21 Ara+90", date(2026,12,21)+td(90)); print("15 Ara+90", date(2026,12,15)+td(90))
print("20 Oca+90", date(2027,1,20)+td(90)); print("10 Nis+90", date(2027,4,10)+td(90))
print("11 Mar+90", date(2027,3,11)+td(90))
print("tol48h", 2+48*3600*50e-6, "ppm/day", 86400*50e-6)
bad=0
for T in range(1,200):
    good=T-(T*80+99)//100
    f=int(__import__('math').floor(T*(1-80/100)))
    bad+= good!=f
print("bad80",bad)
# base45 length for 31 bytes
n=31; print("b45", (n//2)*3+(2 if n%2 else 0))
print("slots 10min/25s", 600/25, "odds", 1e6/(24*3))
