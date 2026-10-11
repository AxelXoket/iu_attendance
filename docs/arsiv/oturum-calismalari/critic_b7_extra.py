from datetime import date, timedelta
print("11 Mar 2027 - 90 =", date(2027,3,11)-timedelta(90))
for d in [date(2026,12,1),date(2026,12,10),date(2026,12,15),date(2026,12,21)]: print(d,"+90",d+timedelta(90))
print("13 Jan", date(2027,1,13).strftime("%A"), "20 Jan", date(2027,1,20).strftime("%A"))
