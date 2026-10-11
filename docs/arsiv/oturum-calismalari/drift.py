# Worst-case monotonic-clock drift between scan and sync, for crystal tolerances.
for ppm in (20, 50, 100):
    for label, secs in (("1 h", 3600), ("8 h", 8*3600), ("1 day", 86400), ("3 days", 3*86400), ("7 days", 7*86400)):
        print(f"{ppm:>3} ppm, sync delay {label:>6}: drift <= {ppm*1e-6*secs:6.2f} s")
# Serial-method throughput for 150 students
for per in (2, 3, 5):
    print(f"serial {per}s/student x 150 = {150*per/60:.1f} min")
# MAC guess probability, one attempt per student per session
print("6-digit code guess p =", 1/10**6, "; 96-bit MAC guess p =", 2**-96)
