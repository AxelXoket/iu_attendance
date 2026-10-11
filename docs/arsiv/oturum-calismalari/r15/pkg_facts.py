"""Deterministic version/health facts for every package and tool named in plan.html.

Sources: npm registry, npm downloads API, GitHub REST (unauthenticated, budgeted),
GitHub releases.atom feeds, Node release schedule, postgresql.org versions feed, PyPI.
Writes pkg-facts.json and pkg-facts.md next to this file. Stdlib only.
"""
import concurrent.futures as cf
import datetime as dt
import json
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

OUT = pathlib.Path(__file__).parent
TODAY = dt.date(2026, 10, 4)
UA = {"User-Agent": "iu-attendance-research/1.0", "Accept": "application/json"}

NPM = [
    # core toolchain
    "typescript", "@typescript/native-preview", "pnpm", "turbo", "@biomejs/biome",
    # server
    "fastify", "zod", "fastify-type-provider-zod", "fastify-zod-openapi", "@fastify/swagger",
    "@fastify/swagger-ui", "openapi-typescript", "openapi-fetch", "orval", "dependency-cruiser",
    "drizzle-orm", "drizzle-kit", "better-auth", "@better-auth/expo", "pg-boss", "graphile-worker",
    "nodemailer", "@fastify/helmet", "@fastify/cors", "@fastify/rate-limit", "@fastify/under-pressure",
    "pino", "@fastify/otel", "@opentelemetry/sdk-node", "@peculiar/asn1-android", "node-app-attest",
    "squawk-cli", "pg", "postgres",
    # tests
    "@cucumber/cucumber", "vitest", "fast-check", "testcontainers", "@testcontainers/postgresql",
    "@stryker-mutator/core", "@stryker-mutator/vitest-runner", "quickpickle", "@amiceli/vitest-cucumber",
    # mobile
    "expo", "react-native", "react", "react-dom", "expo-router", "expo-sqlite", "@tanstack/react-query",
    "@expo/app-integrity", "expo-secure-store", "@noble/curves", "expo-background-task",
    "expo-notifications", "expo-camera", "expo-location", "expo-updates", "expo-device",
    "react-native-ble-manager", "react-native-ble-plx", "munim-bluetooth", "react-native-vision-camera",
    "@powersync/react-native", "@rocicorp/zero",
    # panel
    "vite", "write-excel-file", "xlsx", "@tanstack/react-router", "react-router", "zxing-wasm",
]

# Non-npm tools: (name, owner/repo)
GH_TOOLS = [
    ("k6", "grafana/k6"), ("oasdiff", "oasdiff/oasdiff"), ("squawk", "sbdchd/squawk"),
    ("pgbackrest", "pgbackrest/pgbackrest"), ("mailpit", "axllent/mailpit"),
    ("pgbouncer", "pgbouncer/pgbouncer"), ("valkey", "valkey-io/valkey"),
    ("zxing-cpp", "zxing-cpp/zxing-cpp"), ("obtainium", "ImranR98/Obtainium"),
    ("xprem", None), ("expo-open-ota", "axelmarciano/expo-open-ota"),
    ("hot-updater", "gronxb/hot-updater"),
]

GH_API_BUDGET = 58  # unauthenticated limit is 60/hour


def get(url, accept_json=True, timeout=30):
    req = urllib.request.Request(url, headers=UA if accept_json else {"User-Agent": UA["User-Agent"]})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
        return json.loads(data) if accept_json else data.decode("utf-8", "replace")


def days_ago(iso):
    if not iso:
        return None
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).date()
    return (TODAY - d).days


def repo_of(meta):
    repo = meta.get("repository")
    url = repo.get("url") if isinstance(repo, dict) else repo
    if not url:
        return None
    m = re.search(r"github\.com[/:]([^/]+)/([^/#.]+)", url)
    return f"{m.group(1)}/{m.group(2)}" if m else None


def npm_fact(name):
    enc = urllib.parse.quote(name, safe="@")
    try:
        meta = get(f"https://registry.npmjs.org/{enc.replace('@', '%40', 1) if name.startswith('@') else enc}")
    except urllib.error.HTTPError as e:
        return {"name": name, "error": f"npm {e.code}"}
    tags = meta.get("dist-tags", {})
    latest = tags.get("latest")
    times = meta.get("time", {})
    versions = meta.get("versions", {})
    lv = versions.get(latest, {}) if latest else {}
    # stable releases only, newest first, to show recent cadence
    stable = [(v, times[v]) for v in versions if v in times and not re.search(r"[-+]", v)]
    stable.sort(key=lambda x: x[1], reverse=True)
    try:
        dl = get(f"https://api.npmjs.org/downloads/point/last-week/{name}").get("downloads")
    except Exception:
        dl = None
    return {
        "name": name,
        "latest": latest,
        "latest_date": times.get(latest, "")[:10] if latest else None,
        "latest_age_days": days_ago(times.get(latest)) if latest else None,
        "dist_tags": {k: v for k, v in tags.items() if k != "latest"},
        "last_publish": times.get("modified", "")[:10],
        "recent_stable": [f"{v} ({t[:10]})" for v, t in stable[:4]],
        "created": times.get("created", "")[:10],
        "deprecated": lv.get("deprecated"),
        "license": lv.get("license") if isinstance(lv.get("license"), str) else str(lv.get("license")),
        "maintainers": len(meta.get("maintainers", [])),
        "engines": lv.get("engines"),
        "repo": repo_of(lv) or repo_of(meta),
        "weekly_downloads": dl,
    }


def atom_latest(repo):
    try:
        xml = get(f"https://github.com/{repo}/releases.atom", accept_json=False)
    except Exception as e:
        return {"error": str(e)[:80]}
    ns = {"a": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(xml)
    out = []
    for entry in root.findall("a:entry", ns)[:4]:
        title = entry.findtext("a:title", default="", namespaces=ns).strip()
        upd = entry.findtext("a:updated", default="", namespaces=ns)[:10]
        out.append(f"{title} ({upd})")
    return {"recent_releases": out}


gh_calls = 0


def gh_repo(repo):
    global gh_calls
    if gh_calls >= GH_API_BUDGET:
        return {"skipped": "unauthenticated GitHub API budget used"}
    gh_calls += 1
    try:
        r = get(f"https://api.github.com/repos/{repo}")
    except urllib.error.HTTPError as e:
        return {"error": f"github {e.code}"}
    return {
        "stars": r.get("stargazers_count"),
        "open_issues": r.get("open_issues_count"),
        "pushed_at": (r.get("pushed_at") or "")[:10],
        "pushed_age_days": days_ago(r.get("pushed_at")),
        "archived": r.get("archived"),
        "owner_type": (r.get("owner") or {}).get("type"),
    }


def main():
    facts = {"generated_for": str(TODAY), "npm": {}, "tools": {}, "runtimes": {}}
    with cf.ThreadPoolExecutor(12) as ex:
        for f in ex.map(npm_fact, NPM):
            facts["npm"][f["name"]] = f
    seen = set()
    for name in NPM:
        f = facts["npm"][name]
        repo = f.get("repo")
        if repo and repo not in seen:
            seen.add(repo)
            f["github"] = gh_repo(repo)
    for name, repo in GH_TOOLS:
        if not repo:
            facts["tools"][name] = {"note": "no known GitHub repo; agents must locate it"}
            continue
        entry = {"repo": repo, **atom_latest(repo)}
        entry["github"] = gh_repo(repo)
        facts["tools"][name] = entry
    # Node release schedule
    try:
        sched = get("https://raw.githubusercontent.com/nodejs/Release/main/schedule.json")
        facts["runtimes"]["node"] = {k: v for k, v in sched.items() if k in ("v22", "v24", "v25", "v26", "v27")}
    except Exception as e:
        facts["runtimes"]["node"] = {"error": str(e)[:80]}
    try:
        idx = get("https://nodejs.org/dist/index.json")
        facts["runtimes"]["node_latest"] = [
            f"{r['version']} ({r['date']}) lts={r['lts']}" for r in idx[:8]
        ]
    except Exception as e:
        facts["runtimes"]["node_latest"] = {"error": str(e)[:80]}
    try:
        pg = get("https://www.postgresql.org/versions.json")
        facts["runtimes"]["postgresql"] = [
            {k: v.get(k) for k in ("major", "latestMinor", "relDate", "eolDate", "supported")}
            for v in pg if str(v.get("major")) in ("16", "17", "18", "19")
        ]
    except Exception as e:
        facts["runtimes"]["postgresql"] = {"error": str(e)[:80]}
    try:
        py = get("https://pypi.org/pypi/schemathesis/json")
        rel = py.get("releases", {})
        latest = py["info"]["version"]
        facts["tools"]["schemathesis"] = {
            "latest": latest,
            "latest_date": (rel.get(latest) or [{}])[0].get("upload_time", "")[:10],
        }
    except Exception as e:
        facts["tools"]["schemathesis"] = {"error": str(e)[:80]}
    facts["github_api_calls"] = gh_calls
    (OUT / "pkg-facts.json").write_text(json.dumps(facts, ensure_ascii=False, indent=1), encoding="utf-8")

    lines = [f"# Package facts (machine-collected for {TODAY}; npm registry, npm downloads, GitHub, nodejs.org, postgresql.org, PyPI)", ""]
    lines.append("| package | latest | date | age d | other tags | recent stable | weekly dl | maint | repo | stars | pushed | archived | deprecated |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for name in NPM:
        f = facts["npm"][name]
        if "error" in f:
            lines.append(f"| {name} | ERROR {f['error']} |||||||||||")
            continue
        g = f.get("github") or {}
        tags = ", ".join(f"{k}={v}" for k, v in list(f["dist_tags"].items())[:4])
        lines.append(
            f"| {name} | {f['latest']} | {f['latest_date']} | {f['latest_age_days']} | {tags} | "
            f"{'; '.join(f['recent_stable'][:3])} | {f['weekly_downloads']} | {f['maintainers']} | {f['repo']} | "
            f"{g.get('stars', g.get('skipped', g.get('error', '')))} | {g.get('pushed_at', '')} | {g.get('archived', '')} | "
            f"{(f['deprecated'] or '')[:60]} |"
        )
    lines += ["", "## Non-npm tools", ""]
    for name, e in facts["tools"].items():
        lines.append(f"- {name}: {json.dumps(e, ensure_ascii=False)}")
    lines += ["", "## Runtimes", "", "```json", json.dumps(facts["runtimes"], ensure_ascii=False, indent=1), "```"]
    (OUT / "pkg-facts.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"npm={len(NPM)} tools={len(facts['tools'])} gh_api_calls={gh_calls}")
    errs = [n for n, f in facts["npm"].items() if "error" in f]
    print("npm errors:", errs)


if __name__ == "__main__":
    sys.exit(main())
