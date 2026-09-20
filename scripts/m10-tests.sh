#!/usr/bin/env bash
# Milestone 10 — Integration Tests (Complete + Rating + Reputation + E2E Regression)
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TB=$(cat /tmp/tb); TAD=$(cat /tmp/tad); TSA=$(cat /tmp/t_sA); TSB=$(cat /tmp/t_sB); TSH=$(cat /tmp/t_sH); TSJ=$(cat /tmp/t_sJ)
P2=$(cat /tmp/p2); P4=$(cat /tmp/p4); P6=$(cat /tmp/p6); P8=$(cat /tmp/p8); REACT=$(cat /tmp/react)
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1" | head -1; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
CA=$(PSQ "SELECT id FROM users WHERE email='m7-clienta@example.com'")
IDA=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")
IDH=$(PSQ "SELECT id FROM users WHERE email='m7-spech@example.com'")
IDJ=$(PSQ "SELECT id FROM users WHERE email='m7-specj@example.com'")

echo "═══ Phase E — چرخه‌ی E2E تازه (Regression M06→M10) ═══"
P7=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"اپلیکیشن موبایل م10\",\"description\":\"اپلیکیشن فروش موبایل با React\",\"minBudget\":30000000,\"maxBudget\":60000000,\"deadline\":\"2027-11-01\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1}]}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P7" > /tmp/p7
curl -s -o /dev/null -X POST $B/projects/$P7/submit -H "Authorization: Bearer $TA" && echo "E2E: submit ✓"
curl -s -X POST $B/projects/$P7/matching -H "Authorization: Bearer $TA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('E2E: matching ✓ matches:', j.data.matchesCount, '| اولین:', j.data.items[0].fullName, j.data.items[0].totalScore, j.data.items[0].status)})"
curl -s -o /dev/null -X POST $B/admin/projects/$P7/review -H "Authorization: Bearer $TAD" && echo "E2E: review ✓ (REVIEW)"
curl -s -o /dev/null -X POST $B/admin/projects/$P7/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم اپ موبایل\",\"members\":[{\"specialistId\":\"$IDA\",\"role\":\"Frontend Developer\"}]}" && echo "E2E: team ✓ (TEAM_PROPOSED)"
curl -s -X POST $B/admin/projects/$P7/start -H "Authorization: Bearer $TAD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('E2E: start ✓', j.data.previousStatus+'→'+j.data.newStatus)})"
echo "E2E: تیم بعد از start = $(PSQ "SELECT status FROM teams WHERE project_id='$P7';") (انتظار ACTIVE)"
echo "E2E-22) rating روی IN_PROGRESS: $(code -X POST $B/projects/$P7/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":5}") (409)"
T7=$(curl -s -X POST $B/projects/$P7/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"ساخت رابط کاربری\",\"assignedTo\":\"$IDA\",\"priority\":\"HIGH\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X PUT $B/projects/$P7/tasks/$T7 -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
curl -s -o /dev/null -X PUT $B/projects/$P7/tasks/$T7 -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d '{"status":"DONE"}' && echo "E2E: تسک DONE ✓"
curl -s -X POST $B/admin/projects/$P7/complete -H "Authorization: Bearer $TAD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('E2E: complete ✓', JSON.stringify(j.data))})"
echo "E2E: project=$(PSQ "SELECT status FROM projects WHERE id='$P7';") | team=$(PSQ "SELECT status FROM teams WHERE project_id='$P7';") (COMPLETED/COMPLETED)"
curl -s -o /dev/null -X POST $B/projects/$P7/ratings -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$CA\",\"score\":4,\"review\":\"کارفرمای منظم\"}" && echo "E2E: specialist→client rating ✓ (201)"

echo "═══ Complete (1-14) — روی P2 ═══"
echo "1) no token: $(code -X POST $B/admin/projects/$P2/complete) (401)"
echo "2) client: $(code -X POST $B/admin/projects/$P2/complete -H "Authorization: Bearer $TA") (403)"
echo "3) specialist: $(code -X POST $B/admin/projects/$P2/complete -H "Authorization: Bearer $TSA") (403)"
echo "4) unrelated: $(code -X POST $B/admin/projects/$(node -e "console.log(require('crypto').randomUUID())")/complete -H "Authorization: Bearer $TAD") (404)"
echo "5) not IN_PROGRESS (P4=SUBMITTED): $(code -X POST $B/admin/projects/$P4/complete -H "Authorization: Bearer $TAD") (409)"
PNT=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CA', 'm10-no-team', 'پروژه بدون تیم', 'IN_PROGRESS') RETURNING id;")
echo "6) team missing: $(curl -s -X POST $B/admin/projects/$PNT/complete -H "Authorization: Bearer $TAD" -o /tmp/c6.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/c6.json')).message)")"
PSQ "UPDATE projects SET status='IN_PROGRESS' WHERE id='$P6';" > /dev/null
echo "7) team empty (P6): $(curl -s -X POST $B/admin/projects/$P6/complete -H "Authorization: Bearer $TAD" -o /tmp/c7.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/c7.json')).message)")"
echo "8) team PROPOSED (P8): $(curl -s -X POST $B/admin/projects/$P8/complete -H "Authorization: Bearer $TAD" -o /tmp/c8.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/c8.json')).message)")"
PNS=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CA', 'm10-no-tasks', 'پروژه بدون تسک', 'IN_PROGRESS') RETURNING id;")
TNS=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$PNS', 'تیم بدون تسک', 'ACTIVE') RETURNING id;")
PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$TNS', '$IDA', 'Frontend Developer');" > /dev/null
echo "9) no tasks: $(curl -s -X POST $B/admin/projects/$PNS/complete -H "Authorization: Bearer $TAD" -o /tmp/c9.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/c9.json')).message)")"
echo "10) incomplete task: $(curl -s -X POST $B/admin/projects/$P2/complete -H "Authorization: Bearer $TAD" -o /tmp/c10.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/c10.json')).message)")"
TUN=$(PSQ "SELECT id FROM tasks WHERE project_id='$P2' AND status!='DONE' LIMIT 1;")
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$TUN -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
echo "11) successful complete: $(curl -s -X POST $B/admin/projects/$P2/complete -H "Authorization: Bearer $TAD" -o /tmp/c11.json -w '%{http_code}') — $(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('/tmp/c11.json')).data))")"
echo "12) project: $(PSQ "SELECT status FROM projects WHERE id='$P2';") (COMPLETED)"
echo "13) team: $(PSQ "SELECT status FROM teams WHERE project_id='$P2';") (COMPLETED)"
echo "14) repeated: $(code -X POST $B/admin/projects/$P2/complete -H "Authorization: Bearer $TAD") (409)"

echo "═══ Rating Create (15-29) ═══"
echo "15) no token: $(code -X POST $B/projects/$P2/ratings -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":5}") (401)"
echo "16) unrelated (clientB): $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":5}") (404)"
echo "17) client→member + spoof: $(curl -s -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"fromUserId\":\"$IDJ\",\"projectId\":\"$P4\",\"toUserId\":\"$IDA\",\"score\":5,\"review\":\"توسعه‌دهنده‌ای دقیق و حرفه‌ای\"}" -o /tmp/r17.json -w '%{http_code}') (201)"
node -e "const j=JSON.parse(require('fs').readFileSync('/tmp/r17.json')).data; console.log('    fromUser:', j.fromUser.id===process.argv[1]?'clientA ✓':'✗', '| projectId:', j.projectId===process.argv[2]?'P2 ✓ (spoof نادیده گرفته شد)':'✗')" "$CA" "$P2"
echo "18) specialist→client: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$CA\",\"score\":4}") (201)"
echo "19) client→غیرعضو (specH): $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDH\",\"score\":3}") (403)"
echo "20) specialist→کارفرمای غیر: $(CBID=$(PSQ "SELECT id FROM users WHERE email='m7-clientb@example.com'"); code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$CBID\",\"score\":3}") (403)"
echo "21) self rating: $(curl -s -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$CA\",\"score\":5}" -o /tmp/r21.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/r21.json')).message)") (422)"
echo "22) not COMPLETED (P7 قبل از تکمیل در بالا 409 گرفت ✓ + P4: $(code -X POST $B/projects/$P4/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":5}")) (404 — clientA به P4 مرتبط نیست)"
echo "23) score 0: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDJ\",\"score\":0}") (422)"
echo "24) score 6: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDJ\",\"score\":6}") (422)"
LONG=$(node -e "console.log('x'.repeat(2001))")
echo "25) review بلند: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDJ\",\"score\":3,\"review\":\"$LONG\"}") (422)"
echo "26) review خالی: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDJ\",\"score\":3,\"review\":\"   \"}") (422)"
echo "27) duplicate: $(curl -s -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":4}" -o /tmp/r27.json -w '%{http_code}') — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/r27.json')).message)") (409)"
echo "28) admin به‌عنوان طرف: $(code -X POST $B/projects/$P2/ratings -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"toUserId\":\"$IDA\",\"score\":5}") (403)"
echo "29) PUT/delete rating: $(code -X PUT $B/projects/$P2/ratings -H "Authorization: Bearer $TA") / $(code -X DELETE $B/projects/$P2/ratings -H "Authorization: Bearer $TA") (404 — مسیر وجود ندارد)"

echo "═══ Rating Read (30-35) ═══"
echo "30) owner: $(code $B/projects/$P2/ratings -H "Authorization: Bearer $TA")"
echo "31) member: $(code $B/projects/$P2/ratings -H "Authorization: Bearer $TSA")"
echo "32) admin: $(code $B/projects/$P2/ratings -H "Authorization: Bearer $TAD")"
echo "33) unrelated: $(code $B/projects/$P2/ratings -H "Authorization: Bearer $TB") (404) | specH: $(code $B/projects/$P2/ratings -H "Authorization: Bearer $TSH") (404)"
echo "34) از پروژه دیگر: $(code $B/projects/$P4/ratings -H "Authorization: Bearer $TA") (404)"
curl -s $B/projects/$P2/ratings -H "Authorization: Bearer $TA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const s=JSON.stringify(j);console.log('35) تعداد:', j.data.items.length, '| فیلد حساس؟', /\"email\"|passwordHash/i.test(s), '(false)')})"

echo "═══ Reputation (36-43) ═══"
echo "36) self: $(code $B/users/$CA/reputation -H "Authorization: Bearer $TA")"
echo "37) admin: $(code $B/users/$IDA/reputation -H "Authorization: Bearer $TAD")"
echo "38) عمومی: $(code $B/users/$CA/reputation -H "Authorization: Bearer $TSB")"
echo "39) nonexistent: $(code $B/users/$(node -e "console.log(require('crypto').randomUUID())")/reputation -H "Authorization: Bearer $TA") (404)"
CA_=="$CA" IDA_="$IDA" node - "
const { execSync } = require('child_process');
const psq = (q) => execSync('PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc \"' + q + '\"').toString().trim();
const B = 'http://127.0.0.1:4000/api/v1';
const fs = require('fs');
const TA = fs.readFileSync('/tmp/ta', 'utf8').trim();
const projScore = (n) => n >= 4 ? 100 : [0, 40, 70, 90][n] ?? 0;
for (const [id, label] of [[process.env.CA_, 'clientA'], [process.env.IDA_, 'specA']]) {
  const dbAvg = psq('SELECT round(avg(score),2)::text FROM ratings WHERE to_user_id=\\'' + id + '\\'');
  const dbCount = psq('SELECT count(*) FROM ratings WHERE to_user_id=\\'' + id + '\\'');
  const dbDone = psq('SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id=\\'' + id + '\\' AND t.status=\\'COMPLETED\\'');
  const api = JSON.parse(execSync('curl -s ' + B + '/users/' + id + '/reputation -H "Authorization: Bearer ' + TA + '"').toString()).data;
  const avg = dbAvg === '' ? null : Number(dbAvg);
  const ratingScore = avg === null ? 50 : avg * 20;
  const expTrust = (dbCount === '0' && dbDone === '0') ? 50 : Math.round((0.7 * ratingScore + 0.3 * projScore(Number(dbDone))) * 100) / 100;
  console.log('40-43) ' + label + ': avg=' + api.averageRating + '(' + (String(api.averageRating) === (dbAvg === '' ? 'null' : dbAvg) ? '✓' : '✗') + ') count=' + api.ratingCount + '(' + (String(api.ratingCount) === dbCount ? '✓' : '✗') + ') completed=' + api.completedProjects + '(' + (String(api.completedProjects) === dbDone ? '✓' : '✗') + ') trust=' + api.trustScore + '(' + (api.trustScore === expTrust ? '✓ ' + expTrust : '✗ منتظر ' + expTrust) + ')');
}
"
echo "═══ M10 COMPLETE ═══"
