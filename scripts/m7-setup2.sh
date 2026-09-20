#!/usr/bin/env bash
# تکمیل setup م7 — با ایمیل‌های lowercase (نرمال‌شده در DB)
set -e
B=http://127.0.0.1:4000/api/v1
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1" 2>/dev/null | head -1; }

# غیرفعال‌سازی specE
PSQ "UPDATE users SET is_active=false WHERE email='m7-spece@example.com';" > /dev/null
echo "specE active=$(PSQ "SELECT is_active FROM users WHERE email='m7-spece@example.com'")"

CBID=$(PSQ "SELECT id FROM users WHERE email='m7-clientb@example.com'")
CAID=$(PSQ "SELECT id FROM users WHERE email='m7-clienta@example.com'")
SA=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")
SB=$(PSQ "SELECT id FROM users WHERE email='m7-specb@example.com'")
SH=$(PSQ "SELECT id FROM users WHERE email='m7-spech@example.com'")
SJ=$(PSQ "SELECT id FROM users WHERE email='m7-specj@example.com'")

PRJ=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-pr', 'پروژه رتبه‌دهی seed', 'COMPLETED') RETURNING id;")
PSQ "INSERT INTO ratings (id, project_id, from_user_id, to_user_id, score) VALUES (gen_random_uuid(), '$PRJ', '$CAID', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CBID', '$SA', 5), (gen_random_uuid(), '$PRJ', '$CAID', '$SB', 4), (gen_random_uuid(), '$PRJ', '$CBID', '$SB', 4);" > /dev/null
echo "ratings: specA=$(PSQ "SELECT round(avg(score),2) FROM ratings WHERE to_user_id='$SA'") specB=$(PSQ "SELECT round(avg(score),2) FROM ratings WHERE to_user_id='$SB'")"

for i in 1 2 3; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c$i', 'پروژه کامل‌شده seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer');" > /dev/null
done
P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c4', 'پروژه کامل‌شده seed', 'COMPLETED') RETURNING id;")
T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-4', 'COMPLETED') RETURNING id;")
PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SA', 'Backend Developer'), (gen_random_uuid(), '$T', '$SB', 'Frontend Developer'), (gen_random_uuid(), '$T', '$SH', 'Fullstack Developer');" > /dev/null
for i in 5 6; do
  P=$(PSQ "INSERT INTO projects (id, client_id, title, description, status) VALUES (gen_random_uuid(), '$CBID', 'seed-c$i', 'پروژه کامل‌شده seed', 'COMPLETED') RETURNING id;")
  T=$(PSQ "INSERT INTO teams (id, project_id, name, status) VALUES (gen_random_uuid(), '$P', 'seed-team-$i', 'COMPLETED') RETURNING id;")
  PSQ "INSERT INTO team_members (id, team_id, user_id, role) VALUES (gen_random_uuid(), '$T', '$SJ', 'Frontend Developer');" > /dev/null
done
echo "completed: specA=$(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id='$SA' AND t.status='COMPLETED'") specB=$(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id='$SB' AND t.status='COMPLETED'") specH=$(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id='$SH' AND t.status='COMPLETED'") specJ=$(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE tm.user_id='$SJ' AND t.status='COMPLETED'")"

TA=$(cat /tmp/ta); REACT=$(cat /tmp/react); NODE=$(cat /tmp/node); FIGMA=$(cat /tmp/figma)
RESP=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{
  \"title\":\"طراحی فروشگاه اینترنتی م7\",\"description\":\"ساخت فروشگاه اینترنتی کامل با پنل مدیریت و درگاه پرداخت\",
  \"minBudget\":50000000,\"maxBudget\":80000000,\"deadline\":\"2027-10-15\",
  \"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true},{\"skillId\":\"$NODE\",\"isRequired\":true},{\"skillId\":\"$FIGMA\",\"isRequired\":false}],
  \"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1},{\"roleName\":\"Backend Developer\",\"quantity\":2}]}")
P2=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P2" > /tmp/p2
curl -s -o /dev/null -X POST $B/projects/$P2/submit -H "Authorization: Bearer $TA"
echo "P2=$P2 → $(PSQ "SELECT status FROM projects WHERE id='$P2'")"
P3=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"title":"پیش‌نویس م7","description":"پروژه پیش‌نویس برای تست وضعیت"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
echo "$P3" > /tmp/p3
echo "P3=$P3 → $(PSQ "SELECT status FROM projects WHERE id='$P3'")"
echo "SETUP2 COMPLETE ✓"
