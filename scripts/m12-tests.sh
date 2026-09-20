#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# m12-tests.sh — تست‌های یکپارچگی «Admin Dashboard API» (M12)
# پیش‌نیاز: سرور روی :4000 بالا است و scripts/m10-setup.sh اجرا شده
# سناریوها: احراز ۱-۴ (برای هر ۴ endpoint) | Summary ۵-۱۴ | Recent ۱۵-۲۰ |
#           Attention ۲۱-۲۷ | Match-Summary ۲۸-۳۲
# ─────────────────────────────────────────────────────────────────────────────
set -u
BASE="http://localhost:4000/api/v1/admin/dashboard"
export PGPASSWORD=postgres
PSQL="psql -h 127.0.0.1 -U postgres -d marketplace -tAc"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "TEST-$1 PASS — $2"; }
bad(){ FAIL=$((FAIL+1)); echo "TEST-$1 FAIL — $2"; }

TA=$(cat /tmp/ta); TAD=$(cat /tmp/tad); SA=$(cat /tmp/t_sA)
CA_ID=$($PSQL "SELECT id FROM users WHERE email='m7-clienta@example.com'")

EPs=("$BASE/summary" "$BASE/recent-projects" "$BASE/attention" "$BASE/match-summary")
EPn=("summary" "recent" "attention" "matchsum")

# GET + ذخیره body در /tmp/m12.json + بازگرداندن status
get(){ local tok="$1"; shift; local url="$1"; shift
  curl -s -o /tmp/m12.json -w '%{http_code}' "$@" "$url" ${tok:+"-H" "Authorization: Bearer $tok"}; }
jget(){ node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/m12.json','utf8'));const v=(()=>{try{return ($1)}catch(e){return undefined}})();console.log(typeof v==='object'?JSON.stringify(v):v)" 2>/dev/null; }

echo "═══ بخش ۱: ماتریس احراز هویت/RBAC (۱-۴ × هر ۴ endpoint) ═══"
A1=0;A2=0;A3=0;A4=0
for i in 0 1 2 3; do
  C=$(get "" "${EPs[$i]}");  [ "$C" = "401" ] && A1=$((A1+1))
  C=$(get "$TA" "${EPs[$i]}"); [ "$C" = "403" ] && A2=$((A2+1))
  C=$(get "$SA" "${EPs[$i]}"); [ "$C" = "403" ] && A3=$((A3+1))
  C=$(get "$TAD" "${EPs[$i]}"); [ "$C" = "200" ] && A4=$((A4+1))
done
[ "$A1" = 4 ] && ok 1 "بدون توکن → 401 در هر ۴ endpoint" || bad 1 "401 فقط در $A1/۴"
[ "$A2" = 4 ] && ok 2 "CLIENT → 403 در هر ۴ endpoint" || bad 2 "CLIENT 403 فقط $A1/۴"
[ "$A3" = 4 ] && ok 3 "SPECIALIST → 403 در هر ۴ endpoint (تغییر URL کمکی نمی‌کند)" || bad 3 "SPECIALIST 403 فقط $A3/۴"
[ "$A4" = 4 ] && ok 4 "ADMIN → 200 در هر ۴ endpoint" || bad 4 "ADMIN 200 فقط $A4/۴"

echo "═══ بخش ۲: Dashboard Summary — همه‌ی countها عیناً از DB (۵-۱۴) ═══"
db(){ $PSQL "SELECT count(*) FROM $1 WHERE $2"; }
C=$(get "$TAD" "$BASE/summary")
# مقادیر انتظاری از PostgreSQL
E_TOTAL=$(db users "true"); E_CLI=$(db users "role='CLIENT'"); E_SPE=$(db users "role='SPECIALIST'"); E_ADM=$(db users "role='ADMIN'")
E_ACT=$(db users "is_active=true"); E_INA=$(db users "is_active=false")
E_PT=$(db projects "true")
declare -A EP_ST=( [draft]='DRAFT' [submitted]='SUBMITTED' [matching]='MATCHING' [review]='REVIEW' [teamProposed]='TEAM_PROPOSED' [inProgress]='IN_PROGRESS' [completed]='COMPLETED' [rated]='RATED' [cancelled]='CANCELLED' )
E_MR=$(db matches "status='RECOMMENDED'"); E_MN=$(db matches "status='NEEDS_REVIEW'"); E_MJ=$(db matches "status='REJECTED'")
E_TP=$(db teams "status='PROPOSED'"); E_TA=$(db teams "status='ACTIVE'"); E_TC=$(db teams "status='COMPLETED'")
E_KT=$(db tasks "status='TODO'"); E_KI=$(db tasks "status='IN_PROGRESS'"); E_KD=$(db tasks "status='DONE'")

G(){ jget "d.data.$1"; }
{ [ "$C" = 200 ] && [ "$(G users.total)" = "$E_TOTAL" ]; } && ok 5 "users.total=$E_TOTAL = psql" || bad 5 "users.total=$(G users.total) ≠ $E_TOTAL"
[ "$(G users.clients)" = "$E_CLI" ] && ok 6 "clients=$E_CLI = psql" || bad 6 "clients=$(G users.clients) ≠ $E_CLI"
[ "$(G users.specialists)" = "$E_SPE" ] && ok 7 "specialists=$E_SPE = psql" || bad 7 "specialists=$(G users.specialists) ≠ $E_SPE"
[ "$(G users.admins)" = "$E_ADM" ] && ok 8 "admins=$E_ADM = psql" || bad 8 "admins=$(G users.admins) ≠ $E_ADM"
{ [ "$(G users.active)" = "$E_ACT" ] && [ "$(G users.inactive)" = "$E_INA" ]; } \
  && ok 9 "active=$E_ACT / inactive=$E_INA = psql" || bad 9 "active=$(G users.active)/inactive=$(G users.inactive) ≠ $E_ACT/$E_INA"

PSUM=0; PERR=""
for k in draft submitted matching review teamProposed inProgress completed rated cancelled; do
  EV=$(db projects "status='${EP_ST[$k]}'"); PSUM=$((PSUM+EV))
  [ "$(G projects.$k)" = "$EV" ] || PERR="$PERR $k($(G projects.$k)≠$EV)"
done
{ [ -z "$PERR" ] && [ "$(G projects.total)" = "$E_PT" ] && [ "$PSUM" = "$E_PT" ]; } \
  && ok 10 "هر ۹ وضعیت project + total=$E_PT مطابق psql" || bad 10 "projects:$PERR total=$(G projects.total)≠$E_PT"
{ [ "$(G matches.recommended)" = "$E_MR" ] && [ "$(G matches.needsReview)" = "$E_MN" ] && [ "$(G matches.rejected)" = "$E_MJ" ]; } \
  && ok 11 "matches: rec=$E_MR / review=$E_MN / rej=$E_MJ = psql" || bad 11 "matches $(G matches.recommended)/$(G matches.needsReview)/$(G matches.rejected) ≠ $E_MR/$E_MN/$E_MJ"
{ [ "$(G teams.proposed)" = "$E_TP" ] && [ "$(G teams.active)" = "$E_TA" ] && [ "$(G teams.completed)" = "$E_TC" ]; } \
  && ok 12 "teams: $E_TP/$E_TA/$E_TC = psql" || bad 12 "teams $(G teams.proposed)/$(G teams.active)/$(G teams.completed) ≠ $E_TP/$E_TA/$E_TC"
{ [ "$(G tasks.todo)" = "$E_KT" ] && [ "$(G tasks.inProgress)" = "$E_KI" ] && [ "$(G tasks.done)" = "$E_KD" ]; } \
  && ok 13 "tasks: $E_KT/$E_KI/$E_KD = psql" || bad 13 "tasks $(G tasks.todo)/$(G tasks.inProgress)/$(G tasks.done) ≠ $E_KT/$E_KI/$E_KD"
C2=$(get "$TAD" "$BASE/match-summary")
MT=$(jget "d.data.total")
C=$(get "$TAD" "$BASE/summary")
CONSISTENT=$(node -e "
const d=JSON.parse(require('fs').readFileSync('/tmp/m12.json','utf8')).data;
const okU=d.users.total===d.users.clients+d.users.specialists+d.users.admins;
const okP=d.projects.total===['draft','submitted','matching','review','teamProposed','inProgress','completed','rated','cancelled'].reduce((a,k)=>a+d.projects[k],0);
console.log(okU&&okP?'CONSISTENT':'BROKEN')")
{ [ "$C" = 200 ] && [ "$CONSISTENT" = "CONSISTENT" ] && [ "$MT" = $((E_MR+E_MN+E_MJ)) ]; } \
  && ok 14 "totalها با جمع اجزا و داده‌ی واقعی DB سازگار" || bad 14 "consistency=$CONSISTENT mt=$MT"

echo "═══ بخش ۳: Recent Projects (۱۵-۲۰) ═══"
C=$(get "$TAD" "$BASE/recent-projects?page=2&pageSize=5")
PG=$(jget "d.data.page"); PS=$(jget "d.data.pageSize"); T=$(jget "d.data.total"); TP=$(jget "d.data.totalPages"); N=$(jget "d.data.items.length")
{ [ "$C" = 200 ] && [ "$PG" = 2 ] && [ "$PS" = 5 ] && [ "$T" = "$E_PT" ] && [ "$TP" = $(( (E_PT+4)/5 )) ] && [ "$N" = 5 ]; } \
  && ok 15 "pagination: page=2/pageSize=5 → ۵ آیتم از $E_PT، totalPages=$TP" || bad 15 "p=$PG ps=$PS t=$T tp=$TP n=$N"
C0=$(get "$TAD" "$BASE/recent-projects"); PS0=$(jget "d.data.pageSize")
C100=$(get "$TAD" "$BASE/recent-projects?pageSize=100"); C101=$(get "$TAD" "$BASE/recent-projects?pageSize=101"); CZ=$(get "$TAD" "$BASE/recent-projects?pageSize=0")
{ [ "$PS0" = 10 ] && [ "$C100" = 200 ] && [ "$C101" = "422" ] && [ "$CZ" = "422" ]; } \
  && ok 16 "default pageSize=10؛ سقف ۱۰۰ مجاز و ۱۰۱/۰ → 422" || bad 16 "default=$PS0 p100=$C100 p101=$C101 p0=$CZ"

C=$(get "$TAD" "$BASE/recent-projects?pageSize=100")
MONO=$(jget "d.data.items.every((it,i,a)=>i===0||a[i-1].createdAt>=it.createdAt)?'MONO':'BROKEN'")
[ "$C" = 200 ] && [ "$MONO" = "MONO" ] && ok 17 "sorting createdAt DESC (غیرنزولی)" || bad 17 "createdAt order=$MONO"

# tie-break: دو پروژه‌ی COMPLETED هم‌زمان و جدیدتر از همه → دو آیتم اول با id ASC
TIE_IDS=$($PSQL "SELECT id FROM projects WHERE status='COMPLETED' ORDER BY created_at DESC LIMIT 2" | sort | tr '\n' ' ')
$PSQL "UPDATE projects SET created_at=now()+interval '1 hour', updated_at=now() WHERE id IN ('$(echo $TIE_IDS | awk '{print $1}')','$(echo $TIE_IDS | awk '{print $2}')')" >/dev/null
C=$(get "$TAD" "$BASE/recent-projects?pageSize=5")
FIRST2=$(jget "d.data.items.slice(0,2).map(i=>i.id).sort().join(' ')")
EXP2=$(echo $TIE_IDS | awk '{print $1" "$2}')
SAMECAT=$(jget "d.data.items[0].createdAt===d.data.items[1].createdAt?'SAME':'DIFF'")
{ [ "$C" = 200 ] && [ "$FIRST2" = "$EXP2" ] && [ "$SAMECAT" = "SAME" ]; } \
  && ok 18 "tie-break: createdAt برابر → id ASC (دو آیتم اول)" || bad 18 "first2=[$FIRST2] انتظار=[$EXP2] cat=$SAMECAT"

C=$(get "$TAD" "$BASE/recent-projects?pageSize=5")
FLDS=$(jget "Object.keys(d.data.items[0]).sort().join(',')")
CFLDS=$(jget "Object.keys(d.data.items[0].client).sort().join(',')")
{ [ "$FLDS" = "client,createdAt,deadline,id,maxBudget,minBudget,status,title" ] && [ "$CFLDS" = "fullName,id" ]; } \
  && ok 19 "دقیقاً ۸ فیلد پروژه + client با فقط id/fullName" || bad 19 "fields=$FLDS client=$CFLDS"

C=$(get "$TAD" "$BASE/recent-projects?pageSize=100")
LEAK=$(jget "JSON.stringify(d).match(/passwordHash|password|email|token|secret/i)")
[ "$C" = 200 ] && [ "$LEAK" = "null" ] && ok 20 "بدون email/passwordHash/secret در پاسخ" || bad 20 "leak=$LEAK"

echo "═══ بخش ۴: Attention — SUBMITTED/REVIEW/TEAM_PROPOSED (۲۱-۲۷) ═══"
# سه پروژه‌ی SQL برای پوشش REVIEW و ordering دقیق:
#   review-old:   REVIEW        (قدیمی‌ترین)
#   proposed-mid: TEAM_PROPOSED (میانی)
#   submitted-new: SUBMITTED    (جدیدترین)
$PSQL "INSERT INTO projects (id, client_id, title, description, status, created_at, updated_at) VALUES
 (gen_random_uuid(),'$CA_ID','m12-review-old','d','REVIEW',       now()-interval '3 days', now()),
 (gen_random_uuid(),'$CA_ID','m12-proposed-mid','d','TEAM_PROPOSED',now()-interval '2 days', now()),
 (gen_random_uuid(),'$CA_ID','m12-submitted-new','d','SUBMITTED', now()-interval '1 day',  now())" >/dev/null
E_ATT=$($PSQL "SELECT count(*) FROM projects WHERE status IN ('SUBMITTED','REVIEW','TEAM_PROPOSED')")

C=$(get "$TAD" "$BASE/attention?pageSize=100")
T=$(jget "d.data.total"); STATUSES=$(jget "d.data.items.map(i=>i.status).join(',')")
ONLYOK=$(jget "d.data.items.every(i=>['SUBMITTED','REVIEW','TEAM_PROPOSED'].includes(i.status))?'Y':'N'")
{ [ "$C" = 200 ] && [ "$T" = "$E_ATT" ] && [ "$ONLYOK" = "Y" ]; } \
  && ok 21 "فقط سه وضعیت هدف؛ total=$E_ATT = psql" || bad 21 "total=$T≠$E_ATT only=$ONLYOK statuses=$STATUSES"

$PSQL "UPDATE projects SET status='CANCELLED' WHERE id=(SELECT id FROM projects WHERE status='COMPLETED' AND title NOT LIKE 'm12-%' LIMIT 1)" >/dev/null
C=$(get "$TAD" "$BASE/attention?pageSize=100")
NCANC=$(jget "d.data.items.filter(i=>i.status==='CANCELLED').length"); T=$(jget "d.data.total")
{ [ "$NCANC" = 0 ] && [ "$T" = "$E_ATT" ]; } && ok 22 "CANCELLED (با FLIP مستقیم DB) برنمی‌گردد" || bad 22 "cancelled=$NCANC total=$T"

NC=$(jget "d.data.items.filter(i=>i.status==='COMPLETED').length")
[ "$NC" = 0 ] && ok 23 "COMPLETED برنمی‌گردد" || bad 23 "completed=$NC"
NI=$(jget "d.data.items.filter(i=>i.status==='IN_PROGRESS').length")
[ "$NI" = 0 ] && ok 24 "IN_PROGRESS برنمی‌گردد" || bad 24 "inProgress=$NI"

# اولویت: SUBMITTED(1) → REVIEW(2) → TEAM_PROPOSED(3) — نامنزولی priority
PRIO=$(jget "(()=>{const w={SUBMITTED:1,REVIEW:2,TEAM_PROPOSED:3};return d.data.items.map(i=>w[i.status]).every((v,i,a)=>i===0||a[i-1]<=v)})()?'PRIO':'BROKEN'")
[ "$PRIO" = "PRIO" ] && ok 25 "ordering اولویت: SUBMITTED→REVIEW→TEAM_PROPOSED" || bad 25 "priority=$PRIO ($STATUSES)"
# داخل هر وضعیت createdAt ASC (شامل گروه TEAM_PROPOSED با دو عضو: P6 سپس proposed-mid)
WITHIN=$(jget "(()=>{const g={};for(const it of d.data.items){(g[it.status]=g[it.status]||[]).push(it.createdAt)};return Object.values(g).every(a=>a.every((v,i)=>i===0||a[i-1]<=v))})()?'ASC':'BROKEN'")
[ "$WITHIN" = "ASC" ] && ok 26 "داخل هر وضعیت createdAt ASC (قدیمی‌تر اول)" || bad 26 "within=$WITHIN"

C=$(get "$TAD" "$BASE/attention?page=2&pageSize=2")
PG=$(jget "d.data.page"); N=$(jget "d.data.items.length"); TP=$(jget "d.data.totalPages")
I1=$(get "$TAD" "$BASE/attention?page=1&pageSize=2"); F1=$(jget "d.data.items.map(i=>i.id).join(',')")
C=$(get "$TAD" "$BASE/attention?page=2&pageSize=2"); F2=$(jget "d.data.items.map(i=>i.id).join(',')")
NOVER=$(node -e "const a=process.argv[1].split(','),b=process.argv[2].split(',');console.log(a.filter(x=>b.includes(x)).length?'OVERLAP':'CLEAN')" "$F1" "$F2")
{ [ "$PG" = 2 ] && [ "$N" = 2 ] && [ "$TP" = $(( (E_ATT+1)/2 )) ] && [ "$NOVER" = CLEAN ]; } \
  && ok 27 "pagination: صفحه‌ی ۲ بدون هم‌پوشانی، totalPages درست" || bad 27 "p=$PG n=$N tp=$TP overlap=$NOVER"

echo "═══ بخش ۵: Match Summary (۲۸-۳۲) ═══"
C=$(get "$TAD" "$BASE/match-summary")
{ [ "$C" = 200 ] && [ "$(jget "d.data.recommended")" = "$E_MR" ]; } && ok 28 "recommended=$E_MR = psql" || bad 28 "rec=$(jget 'd.data.recommended')≠$E_MR"
[ "$(jget "d.data.needsReview")" = "$E_MN" ] && ok 29 "needsReview=$E_MN = psql" || bad 29 "nr=$(jget 'd.data.needsReview')≠$E_MN"
[ "$(jget "d.data.rejected")" = "$E_MJ" ] && ok 30 "rejected=$E_MJ = psql" || bad 30 "rej=$(jget 'd.data.rejected')≠$E_MJ"
ETOT=$($PSQL "SELECT count(*) FROM matches")
[ "$(jget "d.data.total")" = "$ETOT" ] && ok 31 "total=$ETOT = count(*) واقعی" || bad 31 "total=$(jget 'd.data.total')≠$ETOT"

# تغییر مستقیم DB: یک NEEDS_REVIEW → REJECTED؛ باید فوراً منعکس شود
FLIP_ID=$($PSQL "SELECT id FROM matches WHERE status='NEEDS_REVIEW' LIMIT 1")
$PSQL "UPDATE matches SET status='REJECTED', updated_at=now() WHERE id='$FLIP_ID'" >/dev/null
C=$(get "$TAD" "$BASE/match-summary")
NR2=$(jget "d.data.needsReview"); RJ2=$(jget "d.data.rejected"); TT2=$(jget "d.data.total")
{ [ "$NR2" = $((E_MN-1)) ] && [ "$RJ2" = $((E_MJ+1)) ] && [ "$TT2" = "$ETOT" ]; } \
  && ok 32 "FLIP مستقیم DB بلافاصله منعکس شد (review $E_MN→$NR2، rej $E_MJ→$RJ2، total ثابت)" \
  || bad 32 "nr=$NR2 rej=$RJ2 tot=$TT2"
$PSQL "UPDATE matches SET status='NEEDS_REVIEW', updated_at=now() WHERE id='$FLIP_ID'" >/dev/null

echo "──────────────────────────"
echo "M12 RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = 0 ] && echo "ALL M12 TESTS PASSED ✓" || echo "M12 HAS FAILURES ✗"
exit $FAIL
