#!/usr/bin/env bash
# M10 Hotfix — تأیید رسمی lifecycle تیم/پروژه در start (اتمیک + rollback + repeated)
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TAD=$(cat /tmp/tad)
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1" | head -1; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
REACT=$(cat /tmp/react)
IDA=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")

mkcycle() { # ساخت پروژه‌ی تازه تا TEAM_PROPOSED — خروجی: projectId
  local P
  P=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"$1\",\"description\":\"پروژه‌ی تأیید lifecycle برای تست اتمیک بودن\",\"minBudget\":10000000,\"maxBudget\":20000000,\"deadline\":\"2027-12-01\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1}]}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
  curl -s -o /dev/null -X POST $B/projects/$P/submit -H "Authorization: Bearer $TA"
  curl -s -o /dev/null -X POST $B/projects/$P/matching -H "Authorization: Bearer $TA"
  curl -s -o /dev/null -X POST $B/admin/projects/$P/review -H "Authorization: Bearer $TAD"
  curl -s -o /dev/null -X POST $B/admin/projects/$P/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم $1\",\"members\":[{\"specialistId\":\"$IDA\",\"role\":\"Frontend Developer\"}]}"
  echo "$P"
}

echo "═══ تست ۱: بعد از start موفق → Project=IN_PROGRESS و Team=ACTIVE ═══"
P1=$(mkcycle "hotfix-A")
echo "قبل: project=$(PSQ "SELECT status FROM projects WHERE id='$P1';") | team=$(PSQ "SELECT status FROM teams WHERE project_id='$P1';")"
RESP=$(curl -s -X POST $B/admin/projects/$P1/start -H "Authorization: Bearer $TAD")
echo "start → $(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.success, j.data.previousStatus+'→'+j.data.newStatus, '| teamId:', j.data.teamId.slice(0,8))})")"
PSTAT=$(PSQ "SELECT status FROM projects WHERE id='$P1';"); TSTAT=$(PSQ "SELECT status FROM teams WHERE project_id='$P1';")
echo "بعد:  project=$PSTAT | team=$TSTAT"
[ "$PSTAT" = "IN_PROGRESS" ] && [ "$TSTAT" = "ACTIVE" ] && echo "✓ TEST-1 PASS" || echo "✗ TEST-1 FAIL"

echo "═══ تست ۲: rollback — شکست فعال‌سازی تیم باید کل transaction را برگرداند ═══"
P2V=$(mkcycle "hotfix-B")
PSQ "UPDATE teams SET status='COMPLETED' WHERE project_id='$P2V';" > /dev/null  # خراب‌کاری: تیم در وضعیت نامعتبر
echo "قبل: project=$(PSQ "SELECT status FROM projects WHERE id='$P2V';") | team=(خراب‌کاری‌شده) COMPLETED"
RC=$(curl -s -X POST $B/admin/projects/$P2V/start -H "Authorization: Bearer $TAD" -o /tmp/hf2.json -w '%{http_code}')
echo "start → $RC — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/hf2.json')).message)")"
PSTAT=$(PSQ "SELECT status FROM projects WHERE id='$P2V';"); TSTAT=$(PSQ "SELECT status FROM teams WHERE project_id='$P2V';")
echo "بعد:  project=$PSTAT (باید TEAM_PROPOSED مانده باشد) | team=$TSTAT (دست‌نخورده)"
[ "$RC" = "409" ] && [ "$PSTAT" = "TEAM_PROPOSED" ] && [ "$TSTAT" = "COMPLETED" ] && echo "✓ TEST-2 PASS (rollback کامل — پروژه نصفه IN_PROGRESS نشد)" || echo "✗ TEST-2 FAIL"

echo "═══ تست ۲b: بازیابی — اصلاح تیم → start مجدد موفق ═══"
PSQ "UPDATE teams SET status='PROPOSED' WHERE project_id='$P2V';" > /dev/null
RC=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/admin/projects/$P2V/start -H "Authorization: Bearer $TAD")
PSTAT=$(PSQ "SELECT status FROM projects WHERE id='$P2V';"); TSTAT=$(PSQ "SELECT status FROM teams WHERE project_id='$P2V';")
echo "start → $RC | project=$PSTAT | team=$TSTAT"
[ "$RC" = "200" ] && [ "$PSTAT" = "IN_PROGRESS" ] && [ "$TSTAT" = "ACTIVE" ] && echo "✓ TEST-2b PASS" || echo "✗ TEST-2b FAIL"

echo "═══ تست ۳: repeated start → 409 و بدون تغییر وضعیت ═══"
RC=$(curl -s -X POST $B/admin/projects/$P1/start -H "Authorization: Bearer $TAD" -o /tmp/hf3.json -w '%{http_code}')
PSTAT=$(PSQ "SELECT status FROM projects WHERE id='$P1';"); TSTAT=$(PSQ "SELECT status FROM teams WHERE project_id='$P1';")
echo "start دوباره → $RC — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/hf3.json')).message)") | project=$PSTAT | team=$TSTAT"
[ "$RC" = "409" ] && [ "$PSTAT" = "IN_PROGRESS" ] && [ "$TSTAT" = "ACTIVE" ] && echo "✓ TEST-3 PASS" || echo "✗ TEST-3 FAIL"

echo "═══ تست ۴: زنجیره‌ی رسمی کامل — start سپس complete (هر دو COMPLETED) ═══"
T=$(curl -s -X POST $B/projects/$P1/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"تسک پایانی\",\"assignedTo\":\"$IDA\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X PUT $B/projects/$P1/tasks/$T -H "Authorization: Bearer $(cat /tmp/t_sA)" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
curl -s -o /dev/null -X PUT $B/projects/$P1/tasks/$T -H "Authorization: Bearer $(cat /tmp/t_sA)" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
RC=$(curl -s -o /dev/null -w '%{http_code}' -X POST $B/admin/projects/$P1/complete -H "Authorization: Bearer $TAD")
PSTAT=$(PSQ "SELECT status FROM projects WHERE id='$P1';"); TSTAT=$(PSQ "SELECT status FROM teams WHERE project_id='$P1';")
echo "complete → $RC | project=$PSTAT | team=$TSTAT"
[ "$RC" = "200" ] && [ "$PSTAT" = "COMPLETED" ] && [ "$TSTAT" = "COMPLETED" ] && echo "✓ TEST-4 PASS" || echo "✗ TEST-4 FAIL"

echo "═══ HOTFIX VERIFICATION DONE ═══"
