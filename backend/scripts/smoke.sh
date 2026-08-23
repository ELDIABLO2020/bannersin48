#!/usr/bin/env bash
# Phase 0 smoke test — run against a locally seeded API (docker compose up -d && npm run start:dev).
# Demonstrates: register → login → fetch catalog → request a quote (3×6 HD Banner 15oz)
# and verifies the quote was persisted with the correct total ($95.50 = 18 sqft × $4.75 + $10 ship).
set -euo pipefail

API="${API:-http://localhost:3001}"
EMAIL="smoke-$(date +%s)@example.com"
PASSWORD="password123"

fail() { echo "✘ $1"; exit 1; }
pass() { echo "✔ $1"; }

command -v jq >/dev/null || fail "jq is required (brew install jq)"

echo "── Smoke test against $API ──"

# 0. Health
curl -sf "$API/health" | jq -e '.status == "ok"' >/dev/null || fail "health check"
pass "GET /health → ok"

# 1. Register
REGISTER=$(curl -sf -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Smoke Tester\"}")
echo "$REGISTER" | jq -e '.user.email == "'"$EMAIL"'" and .token != null' >/dev/null || fail "register"
TOKEN=$(echo "$REGISTER" | jq -r .token)
pass "POST /auth/register → user created, token issued"

# 2. Login
LOGIN=$(curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$LOGIN" | jq -e '.user.fullName == "Smoke Tester"' >/dev/null || fail "login"
pass "POST /auth/login → authenticated"

# 3. Me
curl -sf "$API/auth/me" -H "Authorization: Bearer $TOKEN" | jq -e '.email == "'"$EMAIL"'"' >/dev/null || fail "me"
pass "GET /auth/me → returns profile"

# 4. Catalog
CATALOG=$(curl -sf "$API/catalog/banner")
COUNT=$(echo "$CATALOG" | jq 'length')
[ "$COUNT" -eq 7 ] || fail "catalog expected 7 hub products, got $COUNT"
FIRST_SLUG=$(echo "$CATALOG" | jq -r '.[0].slug')
DETAIL=$(curl -sf "$API/catalog/banner/$FIRST_SLUG")
echo "$DETAIL" | jq -e '.id == "HD_BANNER" and (.commonUses | length > 0)' >/dev/null || fail "catalog detail"
pass "GET /catalog/banner (+/:slug) → 7 hub products, HD Banner detail OK"

# 5. Quote — 3×6 ft HD Banner 15oz qty 1 → $85.50 product + $10 shipping = $95.50
QUOTE=$(curl -sf -X POST "$API/pricing/quote" -H 'Content-Type: application/json' \
  -d '{"productId":"HD_BANNER","material":"VINYL_15OZ_SINGLE","dimensions":{"widthFt":3,"widthIn":0,"heightFt":6,"heightIn":0},"finishing":{"welding":true,"grommets":true},"quantity":1}')
TOTAL=$(echo "$QUOTE" | jq -r .total)
QUOTE_ID=$(echo "$QUOTE" | jq -r .quoteId)
[ "$TOTAL" = "95.5" ] || fail "quote total expected 95.5, got $TOTAL"
pass "POST /pricing/quote → 3×6 HD Banner 15oz total \$$TOTAL (quoteId $QUOTE_ID)"

# 6. Quote persisted?
PERSISTED=$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc \
  "SELECT subtotal || '/' || total FROM "quote" WHERE id = '$QUOTE_ID'")
[ "$PERSISTED" = "85.50/95.50" ] || fail "quote not persisted correctly (got '$PERSISTED')"
pass "Quote snapshot persisted in DB (subtotal 85.50, total 95.50)"

echo ""
echo "All smoke checks passed ✅"
