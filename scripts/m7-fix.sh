#!/usr/bin/env bash
# اصلاح setup م7: توکن‌های تازه + پروفایل/مهارت درست + بازنشانی P2 به SUBMITTED
set -e
B=http://127.0.0.1:4000/api/v1
tok(){ curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"StrongPassword123!\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))"; }
prof(){ curl -s -o /dev/null -X PUT $B/profile/me -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "$2"; }
addsk(){ curl -s -o /dev/null -X POST $B/profile/me/skills -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "{\"skillId\":\"$2\",\"level\":\"$3\",\"yearsOfExperience\":$4}"; }

echo "now=$(date +%s)"
for s in a b c d g h j; do
  T=$(tok "m7-spec$s@example.com")
  echo "$T" > "/tmp/t_s${s^^}"
  # پاک‌سازی مهارت‌های قبلی (در صورت وجود) با حذف مستقیم نیست — از API: خروجی‌ها خالی بودند پس نیازی نیست
done
echo "tokens refreshed ✓"
REACT=$(cat /tmp/react); NODE=$(cat /tmp/node); FIGMA=$(cat /tmp/figma)

prof "$(cat /tmp/t_sA)" '{"fullName":"آرش نیک‌اندیش","jobTitle":"مهندس ارشد نرم‌افزار","yearsOfExperience":9,"availability":"AVAILABLE","hourlyRate":500000}'
prof "$(cat /tmp/t_sB)" '{"fullName":"بابک صادقی","jobTitle":"توسعه‌دهنده فول‌استک","yearsOfExperience":6,"availability":"AVAILABLE","hourlyRate":350000}'
prof "$(cat /tmp/t_sC)" '{"fullName":"چکامه رستمی","jobTitle":"فرانت‌اند","yearsOfExperience":3,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sD)" '{"fullName":"دلارام کاویانی","jobTitle":"بک‌اند","yearsOfExperience":5,"availability":"UNAVAILABLE"}'
prof "$(cat /tmp/t_sE)" '{"fullName":"امیر شریفی","jobTitle":"دواپس","yearsOfExperience":7,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sG)" '{"fullName":"گلناز محمدی","jobTitle":"توسعه‌دهنده","yearsOfExperience":2,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sH)" '{"fullName":"هما نوری","jobTitle":"توسعه‌دهنده وب","yearsOfExperience":9,"availability":"AVAILABLE"}'
prof "$(cat /tmp/t_sJ)" '{"fullName":"جواد امینی","jobTitle":"برنامه‌نویس","yearsOfExperience":4,"availability":"AVAILABLE"}'

addsk "$(cat /tmp/t_sA)" "$REACT" EXPERT 8
addsk "$(cat /tmp/t_sA)" "$NODE"  EXPERT 9
addsk "$(cat /tmp/t_sA)" "$FIGMA" EXPERT 3
addsk "$(cat /tmp/t_sB)" "$REACT" ADVANCED 5
addsk "$(cat /tmp/t_sB)" "$NODE"  EXPERT 6
addsk "$(cat /tmp/t_sC)" "$REACT" INTERMEDIATE 3
addsk "$(cat /tmp/t_sD)" "$REACT" EXPERT 5
addsk "$(cat /tmp/t_sD)" "$NODE"  EXPERT 5
addsk "$(cat /tmp/t_sE)" "$REACT" EXPERT 6
addsk "$(cat /tmp/t_sE)" "$NODE"  EXPERT 6
addsk "$(cat /tmp/t_sG)" "$REACT" ADVANCED 2
addsk "$(cat /tmp/t_sG)" "$NODE"  ADVANCED 2
addsk "$(cat /tmp/t_sG)" "$FIGMA" EXPERT 1
addsk "$(cat /tmp/t_sH)" "$REACT" EXPERT 7
addsk "$(cat /tmp/t_sH)" "$NODE"  ADVANCED 8
addsk "$(cat /tmp/t_sJ)" "$REACT" EXPERT 4
addsk "$(cat /tmp/t_sJ)" "$NODE"  ADVANCED 4

echo "── user_skills پس از اصلاح:"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "SELECT u.email, count(us.id) FROM users u JOIN user_skills us ON us.user_id=u.id WHERE u.email LIKE 'm7-spec%' GROUP BY u.email ORDER BY u.email;"
echo "── بازنشانی P2 به SUBMITTED (dev reset برای اجرای مجدد سناریو)"
P2=$(cat /tmp/p2)
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -qc "UPDATE projects SET status='SUBMITTED' WHERE id='$P2';" > /dev/null
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "SELECT status FROM projects WHERE id='$P2';"
echo "FIX COMPLETE ✓"

# ── مهارت‌های specE از طریق SQL (غیرفعال است — برای تست hard filter) ──
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -qc "
INSERT INTO user_skills (id, user_id, skill_id, level, years_of_experience)
SELECT gen_random_uuid(), u.id, s.id, 'EXPERT', 6
FROM users u, skills s
WHERE u.email='m7-spece@example.com' AND s.name IN ('React','Node.js')
ON CONFLICT (user_id, skill_id) DO NOTHING;" > /dev/null
echo "specE skills via SQL ✓"
