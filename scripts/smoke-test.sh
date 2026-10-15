#!/usr/bin/env bash
set -uo pipefail

SITE_URL="${SITE_URL:?Defina SITE_URL com a URL publicada do site}"
API_URL="${VITE_API_URL:?Defina VITE_API_URL com a URL da API do ambiente}"
SITE_URL="${SITE_URL%/}"
API_ORIGIN="$(node -e 'console.log(new URL(process.argv[1]).origin)' "$API_URL")"
SITE_ORIGIN="$(node -e 'console.log(new URL(process.argv[1]).origin)' "$SITE_URL")"
EXPECTED_ENTRY="${EXPECTED_ENTRY:-}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

failures=0
pass() { echo "ok   $1"; }
fail() { echo "FALHA $1"; [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=Teste pós-deploy::$1"; failures=$((failures + 1)); }

echo "Site: $SITE_ORIGIN  API: $API_ORIGIN"

health=""
for attempt in 1 2 3 4 5; do
  health="$(curl -s --max-time 90 -o "$WORK/health" -w '%{http_code}' "$API_ORIGIN/actuator/health")"
  if [ "$health" = "200" ] && grep -q '"status":"UP"' "$WORK/health"; then break; fi
  echo "     API ainda não respondeu UP (tentativa $attempt, HTTP $health)"
  sleep 15
done
if [ "$health" = "200" ] && grep -q '"status":"UP"' "$WORK/health"; then pass "1 API acordada ($API_ORIGIN/actuator/health)"; else fail "1 API não respondeu UP em $API_ORIGIN/actuator/health (HTTP $health)"; fi

if [ -n "$EXPECTED_ENTRY" ]; then
  live=""
  for attempt in $(seq 1 24); do
    curl -s --max-time 20 "$SITE_URL/" -o "$WORK/home" && grep -qF "$EXPECTED_ENTRY" "$WORK/home" && { live=yes; break; }
    sleep 5
  done
  if [ -n "$live" ]; then pass "0 versão nova no ar ($EXPECTED_ENTRY)"; else fail "0 o site não passou a servir $EXPECTED_ENTRY em 2 minutos"; fi
fi

code="$(curl -s --max-time 30 -D "$WORK/home.headers" -o "$WORK/home" -w '%{http_code}' "$SITE_URL/")"
if [ "$code" = "200" ] && grep -q '<div id="root">' "$WORK/home"; then pass "2 página inicial"; else fail "2 página inicial respondeu HTTP $code ou sem <div id=\"root\">"; fi

header() { grep -i "^$1:" "$WORK/home.headers" | head -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }
csp="$(header Content-Security-Policy)"
connect="$(printf '%s' "$csp" | tr ';' '\n' | sed 's/^ *//' | grep '^connect-src ' | tr -s ' ')"
[ "$connect" = "connect-src 'self' $API_ORIGIN" ] && pass "3 CSP connect-src" || fail "3 CSP connect-src é \"$connect\", esperado \"connect-src 'self' $API_ORIGIN\""
printf '%s' "$csp" | grep -q "frame-ancestors 'none'" && pass "3 CSP frame-ancestors" || fail "3 CSP sem frame-ancestors 'none'"
[ "$(header X-Frame-Options)" = "DENY" ] && pass "3 X-Frame-Options" || fail "3 X-Frame-Options diferente de DENY"
[ "$(header X-Content-Type-Options)" = "nosniff" ] && pass "3 X-Content-Type-Options" || fail "3 X-Content-Type-Options diferente de nosniff"
[ "$(header Referrer-Policy)" = "no-referrer" ] && pass "3 Referrer-Policy" || fail "3 Referrer-Policy diferente de no-referrer"
[ "$(header Cross-Origin-Opener-Policy)" = "same-origin" ] && pass "3 Cross-Origin-Opener-Policy" || fail "3 Cross-Origin-Opener-Policy diferente de same-origin"

code="$(curl -s --max-time 30 -o "$WORK/spa" -w '%{http_code}' "$SITE_URL/tickets")"
if [ "$code" = "200" ] && grep -q '<div id="root">' "$WORK/spa"; then pass "4 fallback de SPA (/tickets)"; else fail "4 /tickets respondeu HTTP $code sem o index.html"; fi

code="$(curl -s --max-time 90 -o "$WORK/refresh" -w '%{http_code}' -X POST "$SITE_URL/api/auth/refresh" -H "Origin: $SITE_ORIGIN" -H "X-Ticketfy-Auth: 1")"
type="$(node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).type ?? "")}catch{console.log("")}' "$WORK/refresh")"
if [ "$code" = "401" ] && [[ "$type" == *session-expired ]]; then
  pass "5 Function → API: /api/auth/refresh respondeu 401 session-expired"
else
  hint=""
  [ "$code" = "500" ] && hint=" (API_ORIGIN ou PROXY_SHARED_SECRET faltando nas variáveis da Pages)"
  [ "$code" = "403" ] && hint=" (CORS_ALLOWED_ORIGINS da API sem $SITE_ORIGIN, ou segredo do proxy diferente)"
  [ "$code" = "502" ] && hint=" (a Function não alcançou a API)"
  fail "5 /api/auth/refresh respondeu HTTP $code, type \"$type\"; esperado 401 session-expired$hint"
fi

code="$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' -X POST "$SITE_URL/api/auth/refresh" -H "Origin: https://evil.example" -H "X-Ticketfy-Auth: 1")"
[ "$code" = "403" ] && pass "6 Function recusa outra origem" || fail "6 /api/auth/refresh com Origin estranho respondeu HTTP $code; esperado 403"

entry="$(grep -o 'src="/assets/[^"]*\.js"' "$WORK/home" | head -1 | sed 's/^src="//; s/"$//')"
if [ -z "$entry" ]; then
  fail "7 não achei o JS de entrada na página inicial"
else
  curl -s --max-time 30 -o "$WORK/map" "$SITE_URL$entry.map"
  if grep -q '"mappings"' "$WORK/map"; then fail "7 $entry.map está publicado"; else pass "7 sem source map ($entry.map)"; fi
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures checagem(ns) falharam."
  exit 1
fi
echo "Todas as checagens passaram."
