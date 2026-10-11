# Token file schema (checked by tcheck.js)

One JSON file per design direction. `node tcheck.js tokens.json --css tokens.css --table contrast.html` must print PASS.
Values below are field descriptions, not suggestions. Choose every value from the research.

```
{
  "name": "<Turkish name of the direction>",
  "undertone": { "name": "<Turkish color name>", "hue": <OKLCH hue degrees>, "why": "<Turkish reason>" },
  "color": {
    "neutral": [ 12 steps: { "step": 1..12, "L": <OKLCH L>, "C": <OKLCH C>, "H": <OKLCH H>, "hex": "#RRGGBB", "use": "<Turkish role>" } ],
    "accent":  [ 12 steps, same shape ],
    "status": { "success": { "solid", "onSolid", "text", "subtle", "border" }, "warning": {...}, "danger": {...}, "info": {...} },
    "attendance": [ { "key": "<ascii key>", "label": "<Turkish label exactly as in brief.md>", "icon": "<icon name from the chosen set>", "fg": "<hex or ref>", "bg": "<hex or ref>", "border": "<hex or ref>" } ],
    "roles": { "<role name>": "<hex, scale ref like neutral.2 / accent.9, or another role>" },
    "pairs": [ { "fg": "<role or ref>", "bg": "<role or ref>", "kind": "text|text-large|ui|decorative", "note": "<optional>" } ]
  },
  "type": {
    "family": "<primary family>", "fallback": "<CSS fallback stack>", "mono": "<numbers and codes strategy>", "license": "<license>",
    "weights": [<numbers>],
    "phone": [ { "name", "size" (pt), "line" (pt), "weight", "tracking" (pt or em, say which in a note), "use" } ],
    "panel": [ { "name", "size" (px), "line" (px), "weight", "tracking", "use" } ],
    "rules": [ "<Turkish rule>" ]
  },
  "shape": {
    "radius": { "<component>": <px, at most 2> },
    "border": { "<name>": "<width and color role>" },
    "elevation": [ { "name", "shadow" (CSS box-shadow or "none"), "rn" (React Native shadow or elevation values), "use" } ]
  },
  "space": { "base": <px>, "scale": [<px values>], "phone": { ... }, "panel": { ... }, "targets": { "phone": <pt or dp>, "panel": <px> } },
  "motion": {
    "duration": [ { "name", "ms", "use" } ],
    "easing": [ { "name", "bezier": [x1, y1, x2, y2], "use" } ],
    "spring": [ { "name", "damping", "stiffness", "mass", "use" } ],
    "patterns": [ { "pattern", "platforms" (telefon|panel|ikisi), "properties", "enter", "exit", "duration", "curve", "origin", "reduced" } ],
    "rules": [ "<Turkish rule>" ]
  },
  "icons": { "set", "style", "stroke", "sizes", "license", "why" },
  "accentUsage": [ { "role": "<Turkish>", "where": "<Turkish: exact places>", "step": "<accent.N>", "why": "<Turkish>" } ],
  "accentNever": [ "<Turkish: where midnight blue never appears>" ],
  "coverageBudget": { "phone": <max percent of a phone screen in the gece mavisi family>, "panel": <max percent>, "exceptions": [ { "screen": "<Turkish>", "max": <percent>, "why": "<Turkish>" } ] },
  "sources": { "<decision key>": [ "<research ids like R01-K02, R03-F05, L1-C03>" ] }
}
```

Required roles: bg.page, bg.surface, text.primary, text.secondary, border.subtle, border.strong, accent.fill, text.onAccent, focus.ring. Add any others you need (bg.sunken, bg.hover, bg.pressed, border.default, text.disabled, accent.text, accent.subtle, accent.fillHover, accent.fillPressed, scrim and so on).

`pairs` must list every foreground and background combination your design actually uses (at least 12). Attendance fg on bg pairs are added automatically. Text needs 4.5:1, large text 3:1, UI components and focus indicators 3:1.

`patterns` must cover: press, hover, focus, toggle, menu, popover, dialog, sheet, drawer, accordion, tab, toast, list, page, success, error, loading. Every pattern states its reduced-motion behavior.

Owner constraint O1 is checked on bg.page: OKLCH L 0.955 to 0.985, chroma at most 0.012, hue 200 to 290 when chroma is above 0.003, CIELAB b* at most 0.

Owner lock (6 October 2026): "neutral" and "accent" must be copied exactly from locked.json (step, L, C, H, hex); bg.page must resolve to #F2F4F8, accent.fill to #143065, focus.ring to #2B58B1. No "alternatives" key. Any color anywhere in the file with OKLCH chroma above 0.02 and hue between 35 and 220 (yellow to green) fails the check.
