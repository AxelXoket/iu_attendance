import math
D=20.0; hfov=math.radians(68)
fov_w=2*D*math.tan(hfov/2)
print(f"FOV width at {D} m: {fov_w:.1f} m")
for qr in (1.4,2.2):
  for ver,mods in ((3,29),(5,37)):
    mod=qr/mods
    for stream in (640,1280,1920):
      for zoom in (1,2,3):
        eff=min(stream*zoom, 4000*1.0) if zoom>1 else stream
        ppm=eff/fov_w*mod*(1 if zoom==1 else 1)  # eff already includes zoom crop
        ppm=stream/(fov_w/zoom)*mod if stream*zoom<=4000 else 4000/fov_w*mod
        print(f"QR {qr} m v{ver} stream {stream} zoom {zoom}x -> {ppm:.2f} px/module")
# screen fit
for diag in (100,120,150):
  h=diag*0.0254*9/math.hypot(16,9)
  print(f'{diag}" 16:9 screen height {h:.2f} m')
