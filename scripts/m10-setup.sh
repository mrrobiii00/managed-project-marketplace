#!/usr/bin/env bash
# بازسازی کامل داده‌ی تست (بعد از reset محیط) — چرخه‌ی کامل تا IN_PROGRESS
set -e
cd /home/user
B=http://127.0.0.1:4000/api/v1
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1" | head -1; }
tok() { curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"StrongPassword123!\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))"; }
skid() { curl -s "$B/skills?search=$1&pageSize=5" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const i=j.data.items.find(x=>x.name===process.argv[1]);console.log(i?i.id:'')})" "$1"; }
prof() { curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "$2"; }
addsk() { curl -s -o /dev/null -X POST $B/profile/me/skills -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"skillId\":\"$2\",\"level\":\"$3\",\"yearsOfExperience\":$4}"; }

echo "── skills seed ──"
npm run db:seed 2>&1 | grep 🌱 || true

echo "── ثبت کاربران ──"
for u in m7-clienta m7-clientb; do
  curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"$u@example.com\",\"password\":\"StrongPassword123!\",\"role\":\"CLIENT\"}"
done
for s in a b c d e g h j; do
  curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' -d "{\"email\":\"m7-spec$s@example.com\",\"password\":\"StrongPassword123!\",\"role\":\"SPECIALIST\"}"
done
PSQ "UPDATE users SET role='ADMIN' WHERE email='m7-admin@example.com';" > /dev/null
curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' -d '{"email":"m7-admin@example.com","password":"StrongPassword123!","role":"SPECIALIST"}' 2>/dev/null || true
PSQ "UPDATE users SET role='ADMIN' WHERE email='m7-admin@example.com';"

echo "── توکن‌ها (11 لاگین) ──"
TA=$(tok m7-clienta@example.com);  echo "$TA"  > /tmp/ta
TB=$(tok m7-clientb@example.com);  echo "$TB"  > /tmp/tb
TAD=$(tok m7-admin@example.com);   echo "$TAD" > /tmp/tad
for s in a b c d g h j; do
  T=$(tok "m7-spec$s@example.com"); echo "$T" > "/tmp/t_s${s^^}"
done

echo "── شناسه مهارت‌ها ──"
REACT=$(skid React); NODE=$(skid Node.js); FIGMA=$(skid Figma)
echo "$REACT" > /tmp/react; echo "$NODE" > /tmp/node; echo "$FIGMA" > /tmp/figma

echo "── پروفایل‌ها ──"
prof "$TA"  '{"fullName":"کارفرمای الف","jobTitle":"کارفرما"}'
prof "$TB"  '{"fullName":"کارفرمای ب","jobTitle":"کارفرما"}'
prof "$TAD" '{"fullName":"مدیر سیستم","jobTitle":"مدیر پلتفرم"}'
prof "$(cat /tmp/t_sA)" '{"fullName":"آرش نیک‌اندیش","jobTitle":"مهندس ارشد نرم‌افزار","yearsOfExperience":9,"availability":"AVAILABLE","hourlyRate":500000}'
prof "$(cat /tmp/t_sB)" '{"fullName":"بابک صادقی","jobTitle":"توسعه‌دهنده فول‌استک","yearsOfExperience":6,"availability":"AVAILABLE","hourlyRate":350000}'
prof "$(cat /tmp/t_sC)" '{"fullName":"چکامه رستمی","jobTitle":"فرانت‌اند","yearsOfExperience":3,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sD)" '{"fullName":"دلارام کاویانی","jobTitle":"بک‌اند","yearsOfExperience":5,"availability":"UNAVAILABLE"}'
prof "$(cat /tmp/t_sG)" '{"fullName":"گلناز محمدی","jobTitle":"توسعه‌دهنده","yearsOfExperience":2,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sH)" '{"fullName":"هما نوری","jobTitle":"توسعه‌دهنده وب","yearsOfExperience":9,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sJ)" '{"fullName":"جواد امینی","jobTitle":"برنامه‌نویس","yearsOfExperience":4,"availability":"AVAILABLE"}'

echo "── مهارت‌ها ──"
addsk "$(cat /tmp/t_sA)" "$REACT" EXPERT 8;  addsk "$(cat /tmp/t_sA)" "$NODE" EXPERT 9;  addsk "$(cat /tmp/t_sA)" "$FIGMA" EXPERT 3
addsk "$(cat /tmp/t_sB)" "$REACT" ADVANCED 5; addsk "$(cat /tmp/t_sB)" "$NODE" EXPERT 6
addsk "$(cat /tmp/t_sC)" "$REACT" INTERMEDIATE 3
addsk "$(cat /tmp/t_sD)" "$REACT" EXPERT 5;   addsk "$(cat /tmp/t_sD)" "$NODE" EXPERT 5
addsk "$(cat /tmp/t_sG)" "$REACT" ADVANCED 2; addsk "$(cat /tmp/t_sG)" "$NODE" ADVANCED 2; addsk "$(cat /tmp/t_sG)" "$FIGMA" EXPERT 1
addsk "$(cat /tmp/t_sH)" "$REACT" EXPERT 7;   addsk "$(cat /tmp/t_sH)" "$NODE" ADVANCED 8
addsk "$(cat /tmp/t_sJ)" "$REACT" EXPERT 4;   addsk "$(cat /tmp/t_sJ)" "$NODE" ADVANCED 4

echo "── specE: غیرفعال + مهارت با SQL ──"
PSQ "UPDATE users SET is_active=false WHERE email='m7-spece@example.com';" > /dev/null
PSQ "INSERT INTO user_skills (id, user_id, skill_id, level, years_of_experience) SELECT gen_random_uuid(), u.id, s.id, 'EXPERT', 6 FROM users u, skills s WHERE u.email='m7-spece@example.com' AND s.name IN ('React','Node.js') ON CONFLICT (user_id, skill_id) DO NOTHING;" > /dev/null

echo "── seed داده‌های aggregation (SQL) ──"
CA=$(PSQ "SELECT id FROM users WHERE email='m7-clienta@example.com'")
CB=$(PSQ "SELECT id FROM users WHERE email='m7-clientb@example.com'")
SA=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")
SB=$(PSQ "SELECT id FROM users WHERE email='m7-specb@example.com'")
SH=$(PSQ "SELECT id FROM users WHERE email='m7-spech@example.com'")
SJ=$(PSQ "SELECT id FROM users WHERE email='m7-specj@example.com'")
PRJ=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CB', 'seed-pr', 'پروژه رتبه seed', 'COMPLETED') RETURNING id;")
PSQ "INSERT INTO ratings (id, project_id, from_user_id, to_user_id, score) VALUES (gen_random_uuid(), '$PRJ', '$CA', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CB', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CA', '$SB', 4), (gen_random_uuid(), '$PRJ', '$CB', '$SB', 4);" > /dev/null
for i in 1 2 3; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CB', 'seed-c$i', 'پروژه کامل seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer');" > /dev/null
done
P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CB', 'seed-c4', 'پروژه کامل seed', 'COMPLETED') RETURNING id;")
T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-4', 'COMPLETED') RETURNING id;")
PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer'), (gen_random_uuid(), '$T', '$SB', 'Frontend Developer'), (gen_random_uuid(), '$T', '$SH', 'Fullstack Developer');" > /dev/null
for i in 5 6; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CB', 'seed-c$i', 'پروژه کامل seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SJ', 'Frontend Developer');" > /dev/null
done
echo "seed: specA ratings=$(PSQ "SELECT count(*) FROM ratings WHERE to_user_id='$SA'") | specA completed=$(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id='$SA' AND t.status='COMPLETED'")"

echo "── P2: چرخه‌ی کامل تا IN_PROGRESS ──"
RESP=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"طراحی فروشگاه اینترنتی\",\"description\":\"ساخت فروشگاه اینترنتی کامل با پنل مدیریت و درگاه پرداخت\",\"minBudget\":50000000,\"maxBudget\":80000000,\"deadline\":\"2027-10-15\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true},{\"skillId\":\"$NODE\",\"isRequired\":true},{\"skillId\":\"$FIGMA\",\"isRequired\":false}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1},{\"roleName\":\"Backend Developer\",\"quantity\":2}]}")
P2=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P2" > /tmp/p2
curl -s -o /dev/null -X POST $B/projects/$P2/submit -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X POST $B/projects/$P2/matching -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X POST $B/admin/projects/$P2/review -H "Authorization: Bearer $TAD"
curl -s -o /dev/null -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم فروشگاه اینترنتی\",\"members\":[{\"specialistId\":\"$SA\",\"role\":\"Backend Developer\"},{\"specialistId\":\"$SJ\",\"role\":\"Frontend Developer\"}]}"
curl -s -o /dev/null -X POST $B/admin/projects/$P2/start -H "Authorization: Bearer $TAD"
echo "P2: $(PSQ "SELECT status FROM projects WHERE id='$P2'") | team: $(PSQ "SELECT status FROM teams WHERE project_id='$P2'")"

echo "── تسک‌های P2 (دو DONE یک IN_PROGRESS برای تست‌ها) ──"
T_A=$(curl -s -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"پیاده‌سازی فرانت فروشگاه\",\"priority\":\"HIGH\",\"dueDate\":\"2027-08-01\",\"assignedTo\":\"$SA\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
T_J=$(curl -s -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $(cat /tmp/t_sJ)" -H 'Content-Type: application/json' -d "{\"title\":\"تست‌های فرانت\",\"assignedTo\":\"$SJ\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
T_U=$(curl -s -X POST $B/projects/$P2/tasks -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"title":"تسک بدون مسئول"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $(cat /tmp/t_sA)" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_A -H "Authorization: Bearer $(cat /tmp/t_sA)" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_J -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"DONE"}'
curl -s -o /dev/null -X PUT $B/projects/$P2/tasks/$T_U -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}'
echo "tasks: $(PSQ "SELECT string_agg(status, ',') FROM tasks WHERE project_id='$P2';")"

echo "── P4 (SUBMITTED) و P6 (TEAM_PROPOSED + تیم خالی) و P8 (IN_PROGRESS + تیم PROPOSED با عضو) ──"
P4=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"پروژه چهارم تست\",\"description\":\"پروژه‌ای در وضعیت SUBMITTED برای تست‌های بررسی\",\"minBudget\":10000000,\"maxBudget\":20000000,\"deadline\":\"2027-12-01\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1}]}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X POST $B/projects/$P4/submit -H "Authorization: Bearer $TA"
echo "$P4" > /tmp/p4
P6=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CA', 'm9-empty-team', 'پروژه تست تیم خالی', 'TEAM_PROPOSED') RETURNING id;")
PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P6', 'تیم خالی', 'PROPOSED');" > /dev/null
echo "$P6" > /tmp/p6
P8=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CA', 'm10-proposed-team', 'پروژه تست تیم پیشنهادی', 'IN_PROGRESS') RETURNING id;")
T8=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P8', 'تیم پیشنهادی', 'PROPOSED') RETURNING id;")
PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T8', '$SA', 'Backend Developer');" > /dev/null
echo "$P8" > /tmp/p8
echo "P4=$(PSQ "SELECT status FROM projects WHERE id='$P4'") | P6=$(PSQ "SELECT status FROM projects WHERE id='$P6'") | P8=$(PSQ "SELECT status FROM projects WHERE id='$P8'")"
echo "SETUP-M10 COMPLETE ✓"
