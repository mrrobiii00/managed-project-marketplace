#!/usr/bin/env bash
# آماده‌سازی داده‌های تست Milestone 07 — از API واقعی + SQL برای داده‌های aggregation
set -e
B=http://127.0.0.1:4000/api/v1
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1"; }

tok() {
  curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"StrongPassword123!\"}" |
    node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))"
}
skid() {
  curl -s "$B/skills?search=$1&pageSize=5" |
    node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const i=j.data.items.find(x=>x.name===process.argv[1]);console.log(i?i.id:'')})" "$1"
}

echo "── ثبت کاربران ──"
for u in m7-clientA m7-clientB; do
  curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' \
    -d "{\"email\":\"$u@example.com\",\"password\":\"StrongPassword123!\",\"role\":\"CLIENT\"}"
done
curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"m7-admin@example.com","password":"StrongPassword123!","role":"SPECIALIST"}'
PSQ "UPDATE users SET role='ADMIN' WHERE email='m7-admin@example.com';"
for s in A B C D E G H J; do
  curl -s -o /dev/null -X POST $B/auth/register -H 'Content-Type: application/json' \
    -d "{\"email\":\"m7-spec$s@example.com\",\"password\":\"StrongPassword123!\",\"role\":\"SPECIALIST\"}"
done

echo "── توکن‌ها ──"
TA=$(tok m7-clientA@example.com); TB=$(tok m7-clientB@example.com); TAD=$(tok m7-admin@example.com)
for s in A B C D E G H J; do eval "T$s=\$(tok m7-spec$s@example.com)"; echo "$T$s" > /tmp/t_s$s; done
echo "$TA" > /tmp/ta; echo "$TB" > /tmp/tb; echo "$TAD" > /tmp/tad

echo "── مهارت‌ها ──"
REACT=$(skid React); NODE=$(skid Node.js); FIGMA=$(skid Figma)
echo "$REACT" > /tmp/react; echo "$NODE" > /tmp/node; echo "$FIGMA" > /tmp/figma
echo "react=$REACT node=$NODE figma=$FIGMA"

echo "── پروفایل متخصصان ──"
prof() { curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $2" -H 'Content-Type: application/json' -d "$3"; }
addsk() { curl -s -o /dev/null -X POST $B/profile/me/skills -H "Authorization: Bearer $2" -H 'Content-Type: application/json' -d "{\"skillId\":\"$3\",\"level\":\"$4\",\"yearsOfExperience\":$5}"; }

# specA — نخبه: هر دو مهارت الزامی EXPERT + Figma، ۹ سال، AVAILABLE
prof x "$TA"  '{"fullName":"کارفرمای الف","jobTitle":"کارفرما"}'
prof x "$TB"  '{"fullName":"کارفرمای ب","jobTitle":"کارفرما"}'
prof x "$TAD" '{"fullName":"مدیر سیستم","jobTitle":"مدیر"}'
prof x "$TA" >/dev/null 2>&1 || true
prof x "$TA" '{"fullName":"کارفرمای الف"}' >/dev/null || true
prof x "$TA" '{"fullName":"کارفرمای الف"}' || true
# واقعی:
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"fullName":"کارفرمای الف","jobTitle":"کارفرما"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $TB" -H 'Content-Type: application/json' -d '{"fullName":"کارفرمای ب","jobTitle":"کارفرما"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"fullName":"مدیر سیستم","jobTitle":"مدیر پلتفرم"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $T_A" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || true

curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sA)" -H 'Content-Type: application/json' -d '{"fullName":"آرش نیک‌اندیش","jobTitle":"مهندس ارشد نرم‌افزار","yearsOfExperience":9,"availability":"AVAILABLE","hourlyRate":500000}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sB)" -H 'Content-Type: application/json' -d '{"fullName":"بابک صادقی","jobTitle":"توسعه‌دهنده فول‌استک","yearsOfExperience":6,"availability":"AVAILABLE","hourlyRate":350000}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sC)" -H 'Content-Type: application/json' -d '{"fullName":"چکامه رستمی","jobTitle":"فرانت‌اند","yearsOfExperience":3,"availability":"AVAILABLE"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sD)" -H 'Content-Type: application/json' -d '{"fullName":"دلارام کاویانی","jobTitle":"بک‌اند","yearsOfExperience":5,"availability":"UNAVAILABLE"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sE)" -H 'Content-Type: application/json' -d '{"fullName":"امیر شریفی","jobTitle":"دواپس","yearsOfExperience":7,"availability":"AVAILABLE"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sG)" -H 'Content-Type: application/json' -d '{"fullName":"گلناز محمدی","jobTitle":"توسعه‌دهنده","yearsOfExperience":2,"availability":"AVAILABLE"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sH)" -H 'Content-Type: application/json' -d '{"fullName":"هما نوری","jobTitle":"توسعه‌دهنده وب","yearsOfExperience":9,"availability":"AVAILABLE"}'
curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $(cat /tmp/t_sJ)" -H 'Content-Type: application/json' -d '{"fullName":"جواد امینی","jobTitle":"برنامه‌نویس","yearsOfExperience":4,"availability":"AVAILABLE"}'

echo "── مهارت‌های متخصصان ──"
addsk x "$(cat /tmp/t_sA)" "$REACT" EXPERT 8
addsk x "$(cat /tmp/t_sA)" "$NODE"  EXPERT 9
addsk x "$(cat /tmp/t_sA)" "$FIGMA" EXPERT 3
addsk x "$(cat /tmp/t_sB)" "$REACT" ADVANCED 5
addsk x "$(cat /tmp/t_sB)" "$NODE"  EXPERT 6
addsk x "$(cat /tmp/t_sC)" "$REACT" INTERMEDIATE 3   # فاقد Node (الزامی) → hard filter
addsk x "$(cat /tmp/t_sD)" "$REACT" EXPERT 5
addsk x "$(cat /tmp/t_sD)" "$NODE"  EXPERT 5          # UNAVAILABLE → hard filter
addsk x "$(cat /tmp/t_sE)" "$REACT" EXPERT 6
addsk x "$(cat /tmp/t_sE)" "$NODE"  EXPERT 6          # inactive می‌شود → hard filter
addsk x "$(cat /tmp/t_sG)" "$REACT" ADVANCED 2
addsk x "$(cat /tmp/t_sG)" "$NODE"  ADVANCED 2
addsk x "$(cat /tmp/t_sG)" "$FIGMA" EXPERT 1          # مهارت اختیاری موجود
addsk x "$(cat /tmp/t_sH)" "$REACT" EXPERT 7
addsk x "$(cat /tmp/t_sH)" "$NODE"  ADVANCED 8
addsk x "$(cat /tmp/t_sJ)" "$REACT" EXPERT 4
addsk x "$(cat /tmp/t_sJ)" "$NODE"  ADVANCED 4

echo "── غیرفعال‌سازی specE (تست hard filter) ──"
PSQ "UPDATE users SET is_active=false WHERE email='m7-specE@example.com';"

echo "── داده‌های aggregation: پروژه‌های completed ساختگی + رتبه‌ها (SQL) ──"
CBID=$(PSQ "SELECT id FROM users WHERE email='m7-clientB@example.com'")
PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-pr', 'پروژه‌ی رتبه‌دهی seed', 'COMPLETED') RETURNING id;" > /tmp/prj_rating
PRJ=$(cat /tmp/prj_rating)
CAID=$(PSQ "SELECT id FROM users WHERE email='m7-clientA@example.com'")
SA=$(PSQ "SELECT id FROM users WHERE email='m7-specA@example.com'")
SB=$(PSQ "SELECT id FROM users WHERE email='m7-specB@example.com'")
SH=$(PSQ "SELECT id FROM users WHERE email='m7-specH@example.com'")
SG=$(PSQ "SELECT id FROM users WHERE email='m7-specG@example.com'")
# رتبه‌ها: specA میانگین 5 (دو رأی)، specB میانگین 4 (دو رأی)
PSQ "INSERT INTO ratings (id, project_id, from_user_id, to_user_id, score) VALUES (gen_random_uuid(), '$PRJ', '$CAID', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CBID', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CAID', '$SB', 4), (gen_random_uuid(), '$PRJ', '$CBID', '$SB', 4);" > /dev/null
# پروژه‌های completed: ۴ مورد برای specA، ۱ برای specB، ۱ برای specH، ۲ برای specJ
for i in 1 2 3; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c$i', 'پروژه‌ی کامل‌شده seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer');" > /dev/null
done
P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c4', 'پروژه‌ی کامل‌شده seed', 'COMPLETED') RETURNING id;")
T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-4', 'COMPLETED') RETURNING id;")
PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer'), (gen_random_uuid(), '$T', '$SB', 'Frontend Developer'), (gen_random_uuid(), '$T', '$SH', 'Fullstack Developer');" > /dev/null
for i in 5 6; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c$i', 'پروژه‌ی کامل‌شده seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  SJ=$(PSQ "SELECT id FROM users WHERE email='m7-specJ@example.com'")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SJ', 'Frontend Developer');" > /dev/null
done

echo "── ساخت پروژه‌ی اصلی P2 (clientA) و پیش‌نویس P3 ──"
RESP=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{
  \"title\":\"طراحی فروشگاه اینترنتی م7\",\"description\":\"ساخت فروشگاه اینترنتی کامل با پنل مدیریت و درگاه پرداخت\",
  \"minBudget\":50000000,\"maxBudget\":80000000,\"deadline\":\"2027-10-15\",
  \"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true},{\"skillId\":\"$NODE\",\"isRequired\":true},{\"skillId\":\"$FIGMA\",\"isRequired\":false}],
  \"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1},{\"roleName\":\"Backend Developer\",\"quantity\":2}]}")
P2=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P2" > /tmp/p2
curl -s -o /dev/null -X POST $B/projects/$P2/submit -H "Authorization: Bearer $TA"
echo "P2=$P2 status=$(PSQ "SELECT status FROM projects WHERE id='$P2'")"
P3=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"پیش‌نویس م7","description":"پروژه‌ی پیش‌نویس برای تست وضعیت"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P3" > /tmp/p3
echo "P3=$P3 (DRAFT)"
echo "SETUP COMPLETE ✓"
