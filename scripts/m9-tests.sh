#!/usr/bin/env bash
# Milestone 09 — Integration Tests (51 سناریو)
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TB=$(cat /tmp/tb); TAD=$(cat /tmp/tad); TSA=$(cat /tmp/t_sA); TSJ=$(cat /tmp/t_sJ); TSH=$(cat /tmp/t_sH)
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1"; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
P2=$(cat /tmp/p2); P3=$(cat /tmp/p3); P4=$(PSQ "SELECT id FROM projects WHERE title='پروژه چهارم تست'")
IDA=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")
IDJ=$(PSQ "SELECT id FROM users WHERE email='m7-specj@example.com'")
IDC=$(PSQ "SELECT id FROM users WHERE email='m7-specc@example.com'")
IDE=$(PSQ "SELECT id FROM users WHERE email='m7-spece@example.com'")
CBID=$(PSQ "SELECT id FROM users WHERE email='m7-clientb@example.com'")
TODAY=$(date -u +%F)
FUTURE=$(date -u -d "+60 days" +%F)

echo "═══ Start Project (1-10) ═══"
echo "1) no token: $(code -X POST $B/admin/projects/$P2/start) (401)"
echo "2) client: $(code -X POST $B/admin/projects/$P2/start -H "Authorization: Bearer $TA") (403)"
echo "3) specialist: $(code -X POST $B/admin/projects/$P2/start -H "Authorization: Bearer $TSA") (403)"
echo "4) wrong project: $(code -X POST $B/admin/projects/$(node -e "console.log(require('crypto').randomUUID())")/start -H "Authorization: Bearer $TAD") (404)"
echo "5) not TEAM_PROPOSED (P4=SUBMITTED): $(code -X POST $B/admin/projects/$P4/start -H "Authorization: Bearer $TAD") (409)"
# P3 → TEAM_PROPOSED بدون تیم
PSQ "UPDATE projects SET status='TEAM_PROPOSED' WHERE id='$P3';" > /dev/null
echo "6) team missing (P3): $(curl -s -X POST $B/admin/projects/$P3/start -H "Authorization: Bearer $TAD" -o /tmp/r6.json -w '%{http_code}') (409) — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/r6.json')).message)")"
PSQ "UPDATE projects SET status='DRAFT' WHERE id='$P3';" > /dev/null
# P6 → TEAM_PROPOSED با تیم خالی
P6=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'm9-empty-team', 'پروژه تست تیم خالی', 'TEAM_PROPOSED') RETURNING id;" | head -1)
PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P6', 'تیم خالی', 'PROPOSED');" > /dev/null
echo "7) empty team (P6): $(curl -s -X POST $B/admin/projects/$P6/start -H "Authorization: Bearer $TAD" -o /tmp/r7.json -w '%{http_code}') (409) — $(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/r7.json')).message)")"
echo "8) successful start (P2):"
curl -s -X POST $B/admin/projects/$P2/start -H "Authorization: Bearer $TAD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('   ', JSON.stringify(j.data))})"
echo "9) repeated start: $(code -X POST $B/admin/projects/$P2/start -H "Authorization: Bearer $TAD") (409)"
echo "10) DB status: $(PSQ "SELECT status FROM projects WHERE id='$P2';") (IN_PROGRESS)"

echo "═══ Task Create (11-25) ═══"
echo "11) no token: $(code -X POST $B/projects/$P2/tasks -H 'Content-Type: application/json' -d '{"title":"تسک تست"}') (401)"
echo "12) unrelated (clientB): $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d '{"title":"تسک تست"}') (404)"
T_A=$(curl -s -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"پیاده‌سازی فرانت فروشگاه\",\"description\":\"صفحات اصلی\",\"priority\":\"HIGH\",\"dueDate\":\"$FUTURE\",\"assignedTo\":\"$IDA\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "13) client owner → T_A=$T_A (201 ✓)"
T_J=$(curl -s -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d "{\"title\":\"تسک خودم\",\"assignedTo\":\"$IDJ\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "14) specialist member (برای خودش) → T_J=$T_J (201 ✓)"
echo "15) specialist non-member (specH): $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TSH" -H 'Content-Type: application/json' -d '{"title":"تسک تست"}') (404)"
T_UN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"title":"تسک بدون مسئول"}'); T_UN_ID=$(PSQ "SELECT id FROM tasks WHERE title='تسک بدون مسئول' AND project_id='$P2';")
echo "16) admin success: $T_UN (201 ✓)"
echo "17) not IN_PROGRESS (P4): $(code -X POST $B/projects/$P4/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"تسک تست"}') (409)"
echo "18) invalid title: $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"ا"}') (422)"
echo "19) invalid priority: $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"تسک تست","priority":"URGENT"}') (422)"
echo "20) invalid dueDate 2026-02-30: $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"تسک تست","dueDate":"2026-02-30"}') (422) | گذشته: $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"تسک تست","dueDate":"2020-01-01"}') (422)"
echo "21) assignee نه SPECIALIST (clientB): $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"تسک تست\",\"assignedTo\":\"$CBID\"}") (422)"
echo "22) assignee inactive (specE): $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"تسک تست\",\"assignedTo\":\"$IDE\"}") (422)"
echo "23) assignee نه عضو تیم (specC): $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"تسک تست\",\"assignedTo\":\"$IDC\"}") (422)"
echo "23b) specialist برای دیگری: $(code -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d "{\"title\":\"تسک تست\",\"assignedTo\":\"$IDA\"}") (403)"
echo "24) unassigned success (بالا: $T_UN) ✓"
echo "25) persisted: projectId/teamId درست؟ $(PSQ "SELECT (project_id='$P2') AND (team_id=(SELECT id FROM teams WHERE project_id='$P2')) FROM tasks WHERE id='$T_A';") (t)"

echo "═══ Task Read (26-33) ═══"
echo "26) list owner: $(code "$B/projects/$P2/tasks" -H "Authorization: Bearer $TA")"
echo "27) list member (specJ): $(code "$B/projects/$P2/tasks" -H "Authorization: Bearer $TSJ")"
echo "28) list admin: $(code "$B/projects/$P2/tasks" -H "Authorization: Bearer $TAD")"
echo "29) list unrelated: $(code "$B/projects/$P2/tasks" -H "Authorization: Bearer $TB") (404) | specH: $(code "$B/projects/$P2/tasks" -H "Authorization: Bearer $TSH") (404)"
echo "30) get task: $(code "$B/projects/$P2/tasks/$T_A" -H "Authorization: Bearer $TSA")"
echo "31) task از پروژه دیگر با projectId غلط: $(code "$B/projects/$P4/tasks/$T_A" -H "Authorization: Bearer $TA") (404)"
echo "32) taskId ناموجود: $(code "$B/projects/$P2/tasks/$(node -e "console.log(require('crypto').randomUUID())")" -H "Authorization: Bearer $TA") (404)"
curl -s "$B/projects/$P2/tasks/$T_A" -H "Authorization: Bearer $TA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.stringify(JSON.parse(d));console.log('33) داده حساس؟', /\"email\"|passwordHash/i.test(s), '(false)')})"
echo "33b) فیلترها: $(curl -s "$B/projects/$P2/tasks?status=TODO&priority=HIGH" -H "Authorization: Bearer $TA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d).data;console.log('status=TODO&priority=HIGH →', j.total, 'نتیجه')})") | pagination: $(curl -s "$B/projects/$P2/tasks?page=1&pageSize=2" -H "Authorization: Bearer $TA" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d).data;console.log(j.items.length,'/',j.total)})")"

echo "═══ Task Update (34-45) ═══"
echo "34) admin full: $(curl -s -X PUT $B/projects/$P2/tasks/$T_UN_ID -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"title\":\"تسک بدون مسئول — ویرایش ادمین\",\"priority\":\"LOW\",\"dueDate\":\"$FUTURE\",\"assignedTo\":\"$IDJ\",\"status\":\"IN_PROGRESS\"}" -o /dev/null -w '%{http_code}') (200)"
echo "35) client owner: $(curl -s -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"پیاده‌سازی فرانت — نسخه ۲"}' -o /dev/null -w '%{http_code}') (200)"
echo "36) specialist assigned → status: $(curl -s -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}' -o /dev/null -w '%{http_code}') (200) → status: $(PSQ "SELECT status FROM tasks WHERE id='$T_A'")"
echo "37) specialist غیرassignee (specJ روی T_A): $(code -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d '{"status":"DONE"}') (403)"
echo "38) specialist تغییر priority: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d '{"priority":"HIGH"}') (403)"
echo "39) specialist تغییر dueDate: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d "{\"dueDate\":\"$FUTURE\"}") (403)"
echo "40) specialist تغییر assignedTo: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TSJ" -H 'Content-Type: application/json' -d "{\"assignedTo\":\"$IDA\"}") (403)"
echo "41) client ارسال projectId/teamId (باید ignore شود): $(curl -s -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"projectId\":\"$P4\",\"teamId\":\"00000000-0000-0000-0000-000000000000\",\"description\":\"توضیح جدید\"}" -o /dev/null -w '%{http_code}') → projectId دست‌نخورده: $(PSQ "SELECT project_id='$P2' AND team_id=(SELECT id FROM teams WHERE project_id='$P2') FROM tasks WHERE id='$T_A';") (t)"
echo "42) گذار نامعتبر TODO→DONE: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"status":"DONE"}') —نکته: client اجازه status ندارد؛ تست واقعی با ادمین: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"DONE"}') (409)"
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
echo "43) DONE→IN_PROGRESS: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}') (409) | DONE→TODO: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"TODO"}') (409) | ویرایش فیلد روی DONE: $(code -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"title":"تغییر روی تسک انجام‌شده"}') (409)"
echo "44) projectId/task ناهمخوان: $(code -X PUT $B/projects/$P4/tasks/$T_A -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"title":"هک"}') (404)"
echo "45) unrelated: $(code -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d '{"title":"هک"}') (404)"

echo "═══ Task Delete (46-51) ═══"
T_D1=$(PSQ "INSERT INTO tasks (id, project_id, team_id, title) VALUES (gen_random_uuid(), '$P2', (SELECT id FROM teams WHERE project_id='$P2'), 'تسک حذف ادمین') RETURNING id;" | head -1)
T_D2=$(PSQ "INSERT INTO tasks (id, project_id, team_id, title) VALUES (gen_random_uuid(), '$P2', (SELECT id FROM teams WHERE project_id='$P2'), 'تسک حذف کارفرما') RETURNING id;" | head -1)
echo "46) admin TODO delete: $(code -X DELETE $B/projects/$P2/tasks/$T_D1 -H "Authorization: Bearer $TAD") (200)"
echo "47) client TODO delete: $(code -X DELETE $B/projects/$P2/tasks/$T_D2 -H "Authorization: Bearer $TA") (200)"
echo "48) specialist delete: $(code -X DELETE $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TSJ") (403)"
echo "49) IN_PROGRESS delete: $(code -X DELETE $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $TA") (409)"
echo "50) DONE delete: $(code -X DELETE $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD") (409)"
echo "51) projectId/task ناهمخوان: $(code -X DELETE $B/projects/$P4/tasks/$T_A -H "Authorization: Bearer $TAD") (404)"
echo "═══ M09 COMPLETE ═══"
