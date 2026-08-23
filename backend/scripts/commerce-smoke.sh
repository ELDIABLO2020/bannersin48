#!/usr/bin/env bash
# Full local commerce + ops smoke:
# register → quote $95.50 → PDF artwork upload → place order → customer timeline
# → admin mark paid → dropship → tracking+label → shipped → delivered → audit/email/reward
# → DB material rate edit affects next quote only → CMS edit is public.
set -euo pipefail

API="${API:-http://localhost:3001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@bannersin48.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-ChangeMe123!}"
RUN_ID="$(date +%s)"
EMAIL="commerce-smoke-$RUN_ID@example.com"
PASSWORD="password123"
TRACKING_NUMBER="79${RUN_ID: -10}"
TMP="$(mktemp -d)"
OLD_RATE=""
HD_ID=""
MATERIAL_ID=""
ADMIN_TOKEN=""
OLD_CONTENT=""

fail() { echo "✘ $1"; exit 1; }
pass() { echo "✔ $1"; }
api_json() { curl -sf "$@"; }

cleanup() {
  if [[ -n "$ADMIN_TOKEN" && -n "$HD_ID" && -n "$MATERIAL_ID" && -n "$OLD_RATE" ]]; then
    curl -sf -X PATCH "$API/admin/products/$HD_ID/materials/$MATERIAL_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
      -d "{\"ratePerSqft\":$OLD_RATE}" >/dev/null 2>&1 || true
  fi
  if [[ -n "$ADMIN_TOKEN" && -n "$OLD_CONTENT" ]]; then
    local payload published
    payload="$(echo "$OLD_CONTENT" | jq -c .payload)"
    published="$(echo "$OLD_CONTENT" | jq -r .published)"
    curl -sf -X PUT "$API/admin/content/announcement" \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
      -d "$(jq -nc --argjson payload "$payload" --argjson published "$published" '{key:"announcement",blockType:"ANNOUNCEMENT",payload:$payload,published:$published}')" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT

for cmd in curl jq docker; do command -v "$cmd" >/dev/null || fail "$cmd is required"; done

echo "── Full commerce smoke against $API ──"
api_json "$API/health" | jq -e '.status == "ok"' >/dev/null || fail "health"
pass "API health"

REGISTER="$(api_json -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Commerce Smoke\"}")"
TOKEN="$(echo "$REGISTER" | jq -r .token)"
[[ "$TOKEN" != "null" ]] || fail "register/token"
pass "Customer registered (no guest checkout)"

QUOTE_BODY='{"productId":"HD_BANNER","material":"VINYL_15OZ_SINGLE","dimensions":{"widthFt":3,"widthIn":0,"heightFt":6,"heightIn":0},"finishing":{"welding":true,"grommets":true},"quantity":1}'
QUOTE="$(api_json -X POST "$API/pricing/quote" -H 'Content-Type: application/json' -d "$QUOTE_BODY")"
[[ "$(echo "$QUOTE" | jq -r .total)" == "95.5" ]] || fail "expected quote 95.5"
pass "3×6 HD Banner 15oz quote = \$95.50"

printf '%%PDF-1.4\n1 0 obj\n<< /Type /Page /MediaBox [0 0 2592 1296] >>\nendobj\n%%%%EOF\n' > "$TMP/artwork.pdf"
UPLOAD="$(api_json -X POST "$API/artwork/upload" -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TMP/artwork.pdf;type=application/pdf")"
ARTWORK_ID="$(echo "$UPLOAD" | jq -r .artworkId)"
[[ -n "$ARTWORK_ID" && "$ARTWORK_ID" != "null" ]] || fail "artwork upload"
pass "PDF artwork uploaded + persisted ($ARTWORK_ID)"

ORDER_BODY="$(jq -nc --arg email "$EMAIL" --arg artwork "$ARTWORK_ID" '{
  email:$email,
  lines:[{productId:"HD_BANNER",material:"VINYL_15OZ_SINGLE",dimensions:{widthFt:3,widthIn:0,heightFt:6,heightIn:0},finishing:{welding:true,grommets:true},quantity:1,artworkId:$artwork}],
  shipTo:{fullName:"Commerce Smoke",street1:"123 Main St",city:"Ypsilanti",region:"MI",postalCode:"48197",country:"US",email:$email},
  acknowledgements:{artworkCorrect:true,spellingColorsLayoutAccepted:true,printsAsUploaded:true,cancellationWindowUnderstood:true,deliveryDateAndAddressConfirmed:true}
}')"
ORDER="$(api_json -X POST "$API/orders" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$ORDER_BODY")"
ORDER_ID="$(echo "$ORDER" | jq -r .id)"
ORDER_NUMBER="$(echo "$ORDER" | jq -r .orderNumber)"
echo "$ORDER" | jq -e '.status=="RECEIVED" and .paymentStatus=="PENDING_PAYMENT" and .total==95.5 and (.events|length)==1 and .proofConfirmedAt!=null' >/dev/null || fail "order snapshot"
pass "Order $ORDER_NUMBER placed; proof/address/prices snapshotted"

api_json "$API/orders" -H "Authorization: Bearer $TOKEN" | jq -e --arg id "$ORDER_ID" '.[] | select(.id==$id and .totalLabel=="$95.50")' >/dev/null || fail "customer order list"
api_json "$API/orders/$ORDER_ID" -H "Authorization: Bearer $TOKEN" | jq -e '.events[0].toStatus=="RECEIVED"' >/dev/null || fail "customer timeline"
pass "Customer dashboard list + persisted timeline"

ADMIN_LOGIN="$(api_json -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")"
ADMIN_TOKEN="$(echo "$ADMIN_LOGIN" | jq -r .token)"
[[ "$(echo "$ADMIN_LOGIN" | jq -r .user.role)" == "ADMIN" ]] || fail "admin role missing"
api_json "$API/admin/orders/buckets" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e '.buckets[] | select(.status=="RECEIVED" and .count>0)' >/dev/null || fail "admin buckets"
pass "Admin kanban sees new order"

api_json -X POST "$API/admin/orders/$ORDER_ID/mark-paid" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
DETAIL="$(api_json "$API/admin/orders/$ORDER_ID" -H "Authorization: Bearer $ADMIN_TOKEN")"
echo "$DETAIL" | jq -e '.status=="IN_PROCESSING" and .paymentStatus=="MARKED_PAID"' >/dev/null || fail "mark paid"
pass "Payment marked; order released to IN_PROCESSING"

api_json -X POST "$API/admin/orders/$ORDER_ID/dropship" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"externalRef":"SMOKE-DS-1001","notes":"commerce smoke"}' >/dev/null
pass "Drop-ship reference recorded"

printf '%%PDF-1.4\n1 0 obj\n/MediaBox [0 0 612 792]\nendobj\n%%%%EOF\n' > "$TMP/label.pdf"
TRACKED="$(api_json -X POST "$API/admin/orders/$ORDER_ID/tracking" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "trackingNumber=$TRACKING_NUMBER" -F "label=@$TMP/label.pdf;type=application/pdf")"
echo "$TRACKED" | jq -e --arg tracking "$TRACKING_NUMBER" '.status=="ACCEPTED" and .shipment.trackingNumber==$tracking and .shipment.labelFileId!=null' >/dev/null || fail "tracking"
pass "Tracking + PDF label attached; order ACCEPTED"

api_json -X POST "$API/admin/orders/$ORDER_ID/status" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"SHIPPED"}' >/dev/null
FINAL="$(api_json -X POST "$API/admin/orders/$ORDER_ID/status" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"status":"DELIVERED"}')"
echo "$FINAL" | jq -e '.status=="DELIVERED" and ([.events[].toStatus] | index("SHIPPED"))!=null and ([.events[].toStatus] | index("DELIVERED"))!=null' >/dev/null || fail "final status"
pass "Order shipped → delivered; events persisted"

ORDER_AUDITS="$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc "SELECT count(*) FROM audit_log WHERE \"entityId\"='$ORDER_ID'")"
TRACKING_AUDITS="$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc "SELECT count(*) FROM audit_log WHERE action='order.tracking_attach' AND diff->'trackingNumber'->>'to'='$TRACKING_NUMBER'")"
AUDITS=$((ORDER_AUDITS + TRACKING_AUDITS))
[[ "$AUDITS" -ge 5 ]] || fail "expected >=5 fulfillment audit rows, got $AUDITS"
EMAILS="$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc "SELECT count(*) FROM email_log WHERE \"orderId\"='$ORDER_ID' AND status='SENT'")"
[[ "$EMAILS" -ge 5 ]] || fail "expected >=5 emails, got $EMAILS"
REWARD="$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc "SELECT \"deltaCents\" FROM reward_ledger WHERE \"orderId\"='$ORDER_ID'")"
[[ "$REWARD" == "95" ]] || fail "expected 95 reward cents, got $REWARD"
pass "Audit ($AUDITS), email log ($EMAILS), 1% reward ledger (95¢)"

PRODUCTS="$(api_json "$API/admin/products" -H "Authorization: Bearer $ADMIN_TOKEN")"
HD_ID="$(echo "$PRODUCTS" | jq -r '.[]|select(.code=="HD_BANNER")|.id')"
MATERIAL_ID="$(echo "$PRODUCTS" | jq -r '.[]|select(.code=="HD_BANNER")|.materials[]|select(.code=="VINYL_15OZ_SINGLE")|.id')"
OLD_RATE="$(echo "$PRODUCTS" | jq -r '.[]|select(.code=="HD_BANNER")|.materials[]|select(.code=="VINYL_15OZ_SINGLE")|.ratePerSqft')"
api_json -X PATCH "$API/admin/products/$HD_ID/materials/$MATERIAL_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"ratePerSqft":5.25}' >/dev/null
NEW_QUOTE="$(api_json -X POST "$API/pricing/quote" -H 'Content-Type: application/json' -d "$QUOTE_BODY")"
[[ "$(echo "$NEW_QUOTE" | jq -r .total)" == "104.5" ]] || fail "DB rate did not affect quote"
OLD_ORDER_TOTAL="$(docker compose exec -T postgres psql -U banners -d bannersin48 -tAc "SELECT total FROM \"order\" WHERE id='$ORDER_ID'")"
[[ "$OLD_ORDER_TOTAL" == "95.50" ]] || fail "old order snapshot changed"
pass "Material \$4.75→\$5.25: next quote \$104.50; old order remains \$95.50"

OLD_CONTENT="$(api_json "$API/content/announcement")"
SMOKE_TEXT="Commerce smoke $(date +%s): orders ship fast"
CONTENT_BODY="$(jq -nc --arg text "$SMOKE_TEXT" '{key:"announcement",blockType:"ANNOUNCEMENT",payload:{text:$text,enabled:true},published:true}')"
api_json -X PUT "$API/admin/content/announcement" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d "$CONTENT_BODY" >/dev/null
api_json "$API/content/announcement" | jq -e --arg text "$SMOKE_TEXT" '.published and .payload.text==$text' >/dev/null || fail "public content"
pass "Admin announcement edit immediately served by GET /content/announcement"

# Restore mutable fixtures before reporting success.
cleanup
trap - EXIT
OLD_RATE=""
OLD_CONTENT=""

echo
echo "Full commerce smoke passed ✅"
