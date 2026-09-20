#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# m11-tests.sh — تست‌های یکپارچگی ماژول «پروژه‌های پیشنهادی متخصص» (M11)
# پیش‌نیاز: سرور روی :4000 بالا است و scripts/m10-setup.sh اجرا شده
#   (P2 با ۵ match واقعی موتور M07: specA 97.5 RECOMMENDED / H 73.5 / B 72.5 /
#    J 70 NEEDS_REVIEW / G 56.93 REJECTED)
# سناریوها: احراز ۱-۴ | فیلتر ۵-۱۱ | IDOR ۱۲-۱۵ | توضیح‌پذیری ۱۶-۱۹ | صفحه‌بندی ۲۰-۲۲
# ─────────────────────────────────────────────────────────────────────────────
set -u
BASE="http://localhost:4000/api/v1/specialists/me/recommended-projects"
export PGPASSWORD=postgres
PSQL="psql -h 127.0.0.1 -U postgres -d marketplace -tAc"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "TEST-$1 PASS — $2"; }
bad(){ FAIL=$((FAIL+1)); echo "TEST-$1 FAIL — $2"; }

P2=$(cat /tmp/p2); P4=$(cat /tmp/p4); P6=$(cat /tmp/p6); P8=$(cat /tmp/p8)
TA=$(cat /tmp/ta); TAD=$(cat /tmp/tad)
SA=$(cat /tmp/t_sA); SB=$(cat /tmp/t_sB); SC=$(cat /tmp/t_sC); SG=$(cat /tmp/t_sG); SH=$(cat /tmp/t_sH); SJ=$(cat /tmp/t_sJ)
SA_ID=$($PSQL "SELECT id FROM users WHERE email='m7-speca@example.com'")

# GET + ذخیره body در فایل + بازگرداندن status
get(){ local tok="$1"; shift; local url="$1"; shift
  curl -s -o /tmp/m11.json -w '%{http_code}' "$@" "$url" ${tok:+"-H" "Authorization: Bearer $tok"}; }
# استخراج فیلد از JSON با node (آرگومان: عبارت JS روی d)
jget(){ node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/m11.json','utf8'));const v=(()=>{try{return ($1)}catch(e){return undefined}})();console.log(typeof v==='object'?JSON.stringify(v):v)" 2>/dev/null; }

echo "═══ بخش ۱: کنترل دسترسی (۱-۴) ═══"
C=$(get "" "$BASE"); [ "$C" = "401" ] && ok 1 "بدون توکن → 401" || bad 1 "بدون توکن → $C (انتظار 401)"
C=$(get "$TA" "$BASE"); [ "$C" = "403" ] && ok 2 "نقش CLIENT → 403" || bad 2 "CLIENT → $C (انتظار 403)"
C=$(get "$TAD" "$BASE"); [ "$C" = "403" ] && ok 3 "نقش ADMIN → 403" || bad 3 "ADMIN → $C (انتظار 403)"
C=$(get "$SA" "$BASE"); [ "$C" = "200" ] && ok 4 "نقش SPECIALIST → 200" || bad 4 "SPECIALIST → $C (انتظار 200)"

echo "═══ بخش ۲: فیلترهای دیتابی (۵-۱۱) ═══"
C=$(get "$SA" "$BASE")
T=$(jget "d.data.total"); FID=$(jget "d.data.items[0].project.id")
ST=$(jget "d.data.items[0].match.status"); TS=$(jget "d.data.items[0].match.totalScore")
{ [ "$C" = 200 ] && [ "$T" = 1 ] && [ "$FID" = "$P2" ] && [ "$ST" = "RECOMMENDED" ] && [ "$TS" = "97.5" ]; } \
  && ok 5 "فقط match های خودِ متخصص؛ RECOMMENDED (97.5) نمایش — total=1، P2" \
  || bad 5 "total=$T pid=$FID st=$ST ts=$TS (انتظار 1/$P2/RECOMMENDED/97.5)"

C=$(get "$SB" "$BASE/$P2")
TS=$(jget "d.data.match.totalScore"); ST=$(jget "d.data.match.status")
{ [ "$C" = 200 ] && [ "$TS" = "72.5" ] && [ "$ST" = "NEEDS_REVIEW" ]; } \
  && ok 6 "امتیازهای خودِ متخصص برگردانده می‌شود (specB: 72.5 نه 97.5 specA)" \
  || bad 6 "specB detail → $C ts=$TS st=$ST (انتظار 200/72.5/NEEDS_REVIEW)"

C=$(get "$SG" "$BASE"); T=$(jget "d.data.total"); N=$(jget "d.data.items.length")
{ [ "$C" = 200 ] && [ "$T" = 0 ] && [ "$N" = 0 ]; } \
  && ok 7 "match با وضعیت REJECTED هرگز نمایش داده نمی‌شود (specG total=0)" \
  || bad 7 "specG total=$T items=$N (انتظار 0)"

C=$(get "$SH" "$BASE"); TS=$(jget "d.data.items[0].match.totalScore"); ST=$(jget "d.data.items[0].match.status")
{ [ "$C" = 200 ] && [ "$TS" = "73.5" ] && [ "$ST" = "NEEDS_REVIEW" ]; } \
  && ok 8 "NEEDS_REVIEW نمایش داده می‌شود (specH 73.5)" \
  || bad 8 "specH ts=$TS st=$ST (انتظار 73.5/NEEDS_REVIEW)"

$PSQL "UPDATE projects SET status='CANCELLED' WHERE id='$P2'" >/dev/null
C=$(get "$SA" "$BASE"); T=$(jget "d.data.total")
C2=$(get "$SA" "$BASE/$P2")
{ [ "$T" = 0 ] && [ "$C2" = "404" ]; } \
  && ok 9 "پروژه CANCELLED در DB مخفی: list total=0 و detail → 404" \
  || bad 9 "CANCELLED: total=$T detail=$C2 (انتظار 0/404)"

$PSQL "UPDATE projects SET status='COMPLETED' WHERE id='$P2'" >/dev/null
C=$(get "$SA" "$BASE"); T=$(jget "d.data.total")
C2=$(get "$SA" "$BASE/$P2")
{ [ "$T" = 0 ] && [ "$C2" = "404" ]; } \
  && ok 10 "پروژه COMPLETED در DB مخفی: list total=0 و detail → 404" \
  || bad 10 "COMPLETED: total=$T detail=$C2 (انتظار 0/404)"

$PSQL "UPDATE projects SET status='IN_PROGRESS' WHERE id='$P2'" >/dev/null
C=$(get "$SA" "$BASE/$P2")
[ "$C" = "200" ] && ok 10.5 "بازگشت به IN_PROGRESS → detail دوباره 200" || bad 10.5 "restore → $C"

C=$(get "$SC" "$BASE"); T=$(jget "d.data.total")
{ [ "$C" = 200 ] && [ "$T" = 0 ]; } \
  && ok 11 "پروژه‌های بدون match برای متخصص برنمی‌گردند (specC total=0)" \
  || bad 11 "specC total=$T (انتظار 0)"

echo "═══ بخش ۳: IDOR / عدم افشا (۱۲-۱۵) ═══"
C=$(get "$SC" "$BASE/$P2"); [ "$C" = "404" ] && ok 12 "detail پروژه‌ای که match آن را ندارم → 404" || bad 12 "specC→P2 detail $C (انتظار 404)"
C=$(get "$SG" "$BASE/$P2"); [ "$C" = "404" ] && ok 13 "detail با match REJECTED → 404 (عدم افشای دلیل)" || bad 13 "specG→P2 detail $C (انتظار 404)"
C=$(get "$SA" "$BASE/00000000-0000-0000-0000-000000000000"); [ "$C" = "404" ] && ok 14 "uuid ناموجود → 404" || bad 14 "uuid ناموجود → $C"
C=$(get "$SA" "$BASE/$P6"); [ "$C" = "404" ] && ok 15 "پروژه فعال ولی بدون match → 404" || bad 15 "P6 detail → $C (انتظار 404)"

echo "═══ بخش ۴: توضیح‌پذیری — اعداد عیناً از DB (۱۶-۱۹) ═══"
DBROW=$($PSQL "SELECT skill_score,experience_score,project_score,rating_score,availability_score,budget_score,total_score,trust_score,upper(status::text) FROM matches WHERE project_id='$P2' AND specialist_id='$SA_ID'")
C=$(get "$SA" "$BASE/$P2")
node -e "
const d=JSON.parse(require('fs').readFileSync('/tmp/m11.json','utf8'));
const parts=process.argv[1].trim().split(/\s*\|\s*/);
const [sk,ex,pr,ra,av,bu,to,tr,st]=parts;
const n=x=>Number(x).toString();
const m=d.data.match, exp={skillScore:n(sk),experienceScore:n(ex),projectScore:n(pr),ratingScore:n(ra),availabilityScore:n(av),budgetScore:n(bu),totalScore:n(to),trustScore:n(tr)};
const got={skillScore:n(m.skillScore),experienceScore:n(m.experienceScore),projectScore:n(m.projectScore),ratingScore:n(m.ratingScore),availabilityScore:n(m.availabilityScore),budgetScore:n(m.budgetScore),totalScore:n(m.totalScore),trustScore:n(m.trustScore)};
const same=JSON.stringify(exp)===JSON.stringify(got)&&m.status===st.trim();
console.log(same?'EXACT':'MISMATCH '+JSON.stringify({exp,got,status:m.status}));" "$DBROW" > /tmp/m11-cmp
R=$(cat /tmp/m11-cmp)
[ "$C" = "200" ] && [ "$R" = "EXACT" ] \
  && ok 16 "هر ۷ مؤلفه + total + trust عیناً برابر مقادیر DB (بدون بازمحاسبه)" \
  || bad 16 "detail $C → $R"

C=$(get "$SA" "$BASE/$P2")
FIELDS=$(jget "Object.keys(d.data.project).sort().join(',')")
LEAK=$(jget "JSON.stringify(d).match(/passwordHash|password|email/g)")
{ [ "$C" = "200" ] && [ "$FIELDS" = "deadline,description,id,maxBudget,minBudget,status,title" ] && [ "$LEAK" = "null" ]; } \
  && ok 17 "detail: فقط ۷ فیلد قراردادی project؛ بدون email/passwordHash" \
  || bad 17 "fields=$FIELDS leak=$LEAK"

C=$(get "$SA" "$BASE"); LEAK=$(jget "JSON.stringify(d).match(/passwordHash|password|email/g)")
[ "$C" = "200" ] && [ "$LEAK" = "null" ] && ok 18 "list: بدون email/passwordHash" || bad 18 "list leak=$LEAK"

DBROW_J=$($PSQL "SELECT total_score,trust_score,upper(status::text) FROM matches WHERE project_id='$P2' AND specialist_id=(SELECT id FROM users WHERE email='m7-specj@example.com')")
C=$(get "$SJ" "$BASE/$P2")
TS=$(jget "d.data.match.totalScore"); ST=$(jget "d.data.match.status")
EXP_TO=$(echo "$DBROW_J" | awk '{print $1}' | sed 's/\.0*$//;s/\.$//')
{ [ "$C" = "200" ] && [ "$TS" = "70" ] && [ "$ST" = "NEEDS_REVIEW" ]; } \
  && ok 19 "specJ: total=70 و NEEDS_REVIEW عین DB" \
  || bad 19 "specJ $C ts=$TS st=$ST (DB: $DBROW_J)"

echo "═══ بخش ۵: صفحه‌بندی + مرتب‌سازی قطعی (۲۰-۲۲) ═══"
# seed دو match اضافی برای specA تا مرتب‌سازی چندکلیدی قابل ارزیابی شود:
#   P8: total=60  trust=90  (ردیف سوم)
#   P4: total=97.5 trust=100 (تساوی کامل با P2 تا سطح trust)
$PSQL "DELETE FROM matches WHERE specialist_id='$SA_ID' AND project_id IN ('$P4','$P8')" >/dev/null
$PSQL "UPDATE projects SET created_at=now() WHERE id IN ('$P4','$P8')" >/dev/null
$PSQL "INSERT INTO matches (id,project_id,specialist_id,skill_score,experience_score,project_score,rating_score,availability_score,budget_score,total_score,trust_score,status,created_at,updated_at) VALUES
 (gen_random_uuid(),'$P8','$SA_ID',60,60,60,60,60,60,60.00,90.00,'RECOMMENDED',now(),now()),
 (gen_random_uuid(),'$P4','$SA_ID',95,95,95,95,95,95,97.50,100.00,'NEEDS_REVIEW',now(),now())" >/dev/null

C=$(get "$SA" "$BASE?page=1&pageSize=20")
PG=$(jget "d.data.page"); PS=$(jget "d.data.pageSize"); T=$(jget "d.data.total"); TP=$(jget "d.data.totalPages")
{ [ "$C" = 200 ] && [ "$PG" = 1 ] && [ "$PS" = 20 ] && [ "$T" = 3 ] && [ "$TP" = 1 ]; } \
  && ok 20 "metadata صفحه‌بندی مطابق قرارداد عمومی (page=1,pageSize=20,total=3,totalPages=1)" \
  || bad 20 "meta p=$PG ps=$PS t=$T tp=$TP (انتظار 1/20/3/1)"

C=$(get "$SA" "$BASE?page=2&pageSize=2")
TP=$(jget "d.data.totalPages"); N=$(jget "d.data.items.length"); T=$(jget "d.data.total")
{ [ "$C" = 200 ] && [ "$TP" = 2 ] && [ "$N" = 1 ] && [ "$T" = 3 ]; } \
  && ok 20b "pageSize=2 → totalPages=2؛ صفحه دوم فقط ۱ آیتم" || bad 20b "tp=$TP n=$N"

C=$(get "$SA" "$BASE?pageSize=0"); C2=$(get "$SA" "$BASE?pageSize=101"); C3=$(get "$SA" "$BASE?page=0")
{ [ "$C" = "422" ] && [ "$C2" = "422" ] && [ "$C3" = "422" ]; } \
  && ok 21 "پارامترهای نامعتبر (pageSize=0/101، page=0) → 422" \
  || bad 21 "pageSize=0→$C pageSize=101→$C2 page=0→$C3 (انتظار 422)"

# سطح ۳ sort: تساوی total و trust بین P2 و P4 → project.createdAt DESC → P4 (جدیدتر) اول؛ P8 (60) آخر
C=$(get "$SA" "$BASE?page=1&pageSize=20")
ORDER=$(jget "d.data.items.map(i=>i.project.id.slice(0,8)).join('>')")
EXP_ORDER="$(node -e "console.log(['$P4','$P2','$P8'].map(x=>x.slice(0,8)).join('>'))")"
[ "$C" = 200 ] && [ "$ORDER" = "$EXP_ORDER" ] \
  && ok 22a "sort: totalScore DESC سپس trustScore DESC سپس createdAt DESC (P4>P2>P8)" \
  || bad 22a "order=$ORDER انتظار=$EXP_ORDER"

# سطح ۴: برابر کردن created_at دو پروژه → tie-breaker نهایی id ASC
$PSQL "UPDATE projects SET created_at=(SELECT created_at FROM projects WHERE id='$P2') WHERE id IN ('$P2','$P4')" >/dev/null
C=$(get "$SA" "$BASE?page=1&pageSize=20")
FIRST=$(jget "d.data.items[0].project.id")
EXP_FIRST=$(node -e "const a='$P2',b='$P4';console.log(a<b?a:b)")
[ "$C" = 200 ] && [ "$FIRST" = "$EXP_FIRST" ] \
  && ok 22b "tie کامل → کلید چهارم id ASC (اولین=${FIRST:0:8})" \
  || bad 22b "first=$FIRST انتظار=$EXP_FIRST"

echo "──────────────────────────"
echo "M11 RESULT: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = 0 ] && echo "ALL M11 TESTS PASSED ✓" || echo "M11 HAS FAILURES ✗"
exit $FAIL
