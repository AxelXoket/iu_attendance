// D15 spec, part 6: shared single files (packages, tool rules, image, release workflows).
'use strict';

const paketler = [
  "Kök package.json: private, packageManager pnpm@12 tam sürüm (teknik.html#temel), engines.node 26; betikler: dev (docker compose --profile dev up --wait, sunucuda node --run db:migrate, sonra pnpm -r --parallel ile sunucu, işçi ve panel), denetle (biome ci ve tip denetimi), test (pnpm -r test).",
  "pnpm-workspace.yaml: packages apps/* ve packages/*; minimumReleaseAge: 1440 açıkça (katı), trustPolicy: no-downgrade, allowBuilds yalnız gerekçesi yazılı paketler, pmOnFail: ignore (Dependabot tek belgeli kilit dosyası okur), shellEmulator: true (TZ=UTC gibi ortam önekli betikler Windows'ta da çalışsın), overrides yalnız pnpm deploy tek sürüm istediğinde ve gerekçesiyle.",
  "Katalog (tek yerde sürüm): typescript ~6.0, zod 4.2 ve üstü, vitest 5 ile aynı sürümde @vitest/coverage-v8, fast-check; SheetJS 0.20.3 kendi sitesindeki paket dosyasından (D03 isteği: packages/core'da yalnız geliştirme bağımlılığı, panelle aynı dosya; teknik.html#panel-excel).",
  "apps/server/package.json tam sabit sürümler: fastify 5.12.5 ve üstü, fastify-type-provider-zod 7, drizzle-orm 1.0.0-rc.4, pg-boss 12.36.0 ve üstü, nodemailer, pg-boss'un kullandığı cron-parser (D14 isteği), pino, @cucumber/cucumber 13.2 ve üstü, @fastify/helmet, @fastify/rate-limit, @fastify/under-pressure, @fastify/cookie (D13); betikler: db:migrate (D12 göç adımı, pg-boss migrate, worker.ts kur; tek betik, teknik.html#altyapi-imaj), test:senaryo (TZ=UTC cucumber-js), test:birim (TZ=UTC vitest run).",
  "packages/core/package.json betikleri: test (TZ=UTC vitest run --coverage, satır ve dal eşiği 90 komut satırında), test:istanbul (TZ=Europe/Istanbul vitest run; teknik.html#testler-veritabani-sifirlama), mutasyon (stryker run, sonra node stryker-esik-denetimi.ts). stryker.config.json: testRunner command, commandRunner.command 'pnpm vitest run', Vitest eklentisi kurulmaz (teknik.html#testler-kalite), reporters json ve clear-text, concurrency işlemci sayısı.",
  "biome.json: biçimlendirme ve recommended kurallar; noFloatingPromises hata düzeyinde apps/server ve apps/mobile'da; noNodejsModules packages/core ve packages/contracts'ta (teknik.html#temel); noPrivateImports hata düzeyinde (modül sınırı, teknik.html#sunucu-mimari); noRestrictedImports: pg-boss ve nodemailer yalnız infra/is-kuyrugu ve infra/eposta'da (D14 isteği), pino yalnız infra/izleme'de, infra/** altından modules/** yasak, dotenv her yerde yasak, tsx yalnız test/steps altında (teknik.html#testler).",
  "tsconfig.base.json: strict, module ve moduleResolution nodenext, verbatimModuleSyntax ve erasableSyntaxOnly açık, enum ve paths yok, types açıkça; apps/server allowImportingTsExtensions ve noEmit, packages/core rewriteRelativeImportExtensions (teknik.html#temel).",
  "apps/server/cucumber.js: import önce test/support/**, sonra test/steps/** (kancaların sırası sabit); features/**/*.feature; dil tr; parallel os.availableParallelism(); retry yok; FSTDEP uyarısı kancada kırmızı.",
  ".env.example: ayar şemasındaki her ortam değişkeni geliştirme değeriyle ve açıklamasıyla; sır yok (sırlar ./.gizli altında, anahtar-uret uret ve D12'nin gelistirme-gizli-uret.sh üretir).",
];

const imaj = [
  "apps/server/Dockerfile çok aşamalı (teknik.html#altyapi-imaj): taban Node 26 resmî imajı özetle sabit (Dependabot FROM satırını yükseltir), pnpm resmî imajı packageManager sürümüyle.",
  "derle aşaması: çalışma alanı bildirimleri ve kilit dosyası, pnpm install --frozen-lockfile, packages/core ve packages/contracts tsc ile JS'e (Node node_modules altında .ts çalıştırmaz), pnpm deploy --filter sunucu --prod /cikti; CI'nın ürettiği yayin-bilgisi.json kopyalanır.",
  "panel aşaması: apps/panel Vite derlemesi (harita dışı kod, D15 yalnız derler).",
  "sunucu hedefi: /app altında deploy çıktısı ve yayin-bilgisi.json; /durum/api node sahipli açılır (adlı birim sahipliği imajdan alır); USER node; ENV TZ=UTC NODE_ENV=production; LABEL org.opencontainers.image.revision; aynı imaj API, işçi ve göç servisi olur.",
  "caddy hedefi: Caddy resmî imajı özetle sabit; /etc/caddy/Caddyfile, /srv/panel (panel çıktısı), /srv/sayfalar (gizlilik D15, hesap silme D01).",
  "Dockerfile.dockerignore: node_modules, .git, testler dışı veriler ve infra/izleme/makine (ana makine betikleri imaja girmez).",
];

const yayin_is_akislari = [
  "yayin-sunucu.yml: etiket (sunucu/v*) ya da elle; önce haftalik.yml'nin son koşusu yeşil olmalı (değilse durur); yayin-bilgisi-uret.ts, iki hedefin derlenmesi, GHCR'ye yükleme (iş düzeyinde packages: write), anahtarlı cosign imzası (sırlar sunucu-yayin ortamında, sahibin onayıyla), özetlerin yayın notuna ve surum.env yapıtına yazılması. CI sunucuya erişmez.",
  "yayin-ota.yml: yalnız elle; 'ota-yayin' ortamı sahibin onayını ister; xprem ile aynı sürümdeki eoas (docker/xprem/surum.env) ile yayın; ota/<runtimeVersion>/<güncelleme kimliği> etiketi (iş düzeyinde contents: write); iş özetine güncelleme kimliği, runtimeVersion, yüzde ve commit (D15-B31).",
  "Ortak: permissions: contents: read varsayılan, her eylem tam commit özetiyle, eylem çalışma ortamı Node 24, concurrency ile aynı yayının iki koşusu engellenir; APK yayınlanan GitHub sürümleri değiştirilemez ayarlı (teknik.html#altyapi-imaj).",
];

module.exports = { paketler, imaj, yayin_is_akislari };
