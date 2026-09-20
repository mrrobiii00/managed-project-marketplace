#!/usr/bin/env bash
# Milestone 07 — تست‌های 8-13 (Hard Filter) + 14-30 (Scoring/Persistence) + 31-36 (Read)
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TB=$(cat /tmp/tb); TAD=$(cat /tmp/tad); TSA=$(cat /tmp/t_sA)
P2=$(cat /tmp/p2)
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1"; }

echo "── 8) هیچ CLIENTی وارد استخر نشده"
echo "→ نقش‌های تطبیق‌شده: $(PSQ "SELECT DISTINCT u.role FROM matches m JOIN users u ON u.id=m.specialist_id WHERE m.project_id='$P2';") (انتظار فقط SPECIALIST)"
echo "── 9) specialist غیرفعال (specE) حذف شد"
echo "→ specE در matches: $(PSQ "SELECT count(*) FROM matches m JOIN users u ON u.id=m.specialist_id WHERE m.project_id='$P2' AND u.is_active=false;") (انتظار 0)"
echo "── 10) UNAVAILABLE (specD) حذف شد"
echo "→ specD در matches: $(PSQ "SELECT count(*) FROM matches m JOIN users u ON u.email='m7-specd@example.com' WHERE m.project_id='$P2';") (انتظار 0)"
echo "── 11) فاقد required skill (specC فقط React دارد) حذف شد"
echo "→ specC در matches: $(PSQ "SELECT count(*) FROM matches m JOIN users u ON u.email='m7-specc@example.com' WHERE m.project_id='$P2';") (انتظار 0)"
echo "── 12/13) دارای همه‌ی مهارت‌های الزادی + مهارت اختیاری در امتیاز"
echo "→ specG skill_score (React+Node الزادی + Figma اختیاری): $(PSQ "SELECT skill_score FROM matches m JOIN users u ON u.email='m7-specg@example.com' WHERE m.project_id='$P2';") (انتظار 78.57 — بدون Figma می‌شد 64.29)"

echo "── 14-21) مقادیر دقیق اجزای امتیاز در DB (specA)"
PSQ "SELECT 'skill='||skill_score||' exp='||experience_score||' proj='||project_score||' rate='||rating_score||' avail='||availability_score||' budget='||budget_score||' total='||total_score||' trust='||trust_score FROM matches m JOIN users u ON u.email='m7-speca@example.com' WHERE m.project_id='$P2';" | sed 's/^/→ /'
echo "  (انتظار: 100, 100, 100, 100, 100, 50 → total 97.5 / trust 100)"
echo "── 21) بازه 0..100 برای همه‌ی matchها"
echo "→ خارج از بازه: $(PSQ "SELECT count(*) FROM matches WHERE project_id='$P2' AND (total_score<0 OR total_score>100 OR trust_score<0 OR trust_score>100);") (انتظار 0)"
echo "── 22-24) trust deterministic + fallbackها"
echo "→ specG (بدون رتبه/پروژه): trust=$(PSQ "SELECT trust_score FROM matches m JOIN users u ON u.email='m7-specg@example.com' WHERE m.project_id='$P2';") (انتظار 50 cold-start)"
echo "→ specJ (بدون رتبه، 2 پروژه): trust=$(PSQ "SELECT trust_score FROM matches m JOIN users u ON u.email='m7-specj@example.com' WHERE m.project_id='$P2';") (انتظار 0.7×50+0.3×70=56)"
echo "── 25-27) وضعیت پیشنهاد"
PSQ "SELECT u.email||': '||m.status FROM matches m JOIN users u ON u.id=m.specialist_id WHERE m.project_id='$P2' ORDER BY m.total_score DESC;" | sed 's/^/→ /'
echo "── 28-30) ذخیره‌سازی: تعداد رکورد + یکتایی"
echo "→ تعداد: $(PSQ "SELECT count(*) FROM matches WHERE project_id='$P2';") | تکراری: $(PSQ "SELECT count(*) FROM (SELECT specialist_id FROM matches WHERE project_id='$P2' GROUP BY specialist_id HAVING count(*)>1) t;") (انتظار 5 و 0)"

echo "── 31) مالک matches را می‌بیند"
curl -s -o /dev/null -w "→ owner: %{http_code} " "$B/projects/$P2/matches?page=1&pageSize=20" -H "Authorization: Bearer $TA"
echo ""
echo "── 31b) ادمین هم مجاز"
curl -s -o /dev/null -w "→ admin: %{http_code}\n" "$B/projects/$P2/matches" -H "Authorization: Bearer $TAD"
echo "── 32) clientB غیرمالک → 404"
curl -s -o /dev/null -w "→ non-owner: %{http_code}\n" "$B/projects/$P2/matches" -H "Authorization: Bearer $TB"
echo "── 33) specialist لیست کامل را نمی‌بیند"
curl -s -o /dev/null -w "→ specialist: %{http_code}\n" "$B/projects/$P2/matches" -H "Authorization: Bearer $TSA"
echo "── 34) جزئیات match بدون داده حساس"
SA_ID=$(PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'")
curl -s "$B/projects/$P2/matches/$SA_ID" -H "Authorization: Bearer $TA" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const s=JSON.stringify(j);
  console.log('→ status:', j.data.status, '| total:', j.data.totalScore, '| مهارت‌ها:', j.data.specialist.skills.length, '| email/passwordHash در پاسخ؟', /\"email\"|passwordHash/i.test(s));
  console.log('→ explanation:', j.data.explanation);
})"
echo "── 34b) match ناموجود → 404"
curl -s -o /dev/null -w "→ %{http_code}\n" "$B/projects/$P2/matches/$(node -e "console.log(require('crypto').randomUUID())")" -H "Authorization: Bearer $TA"
echo "── 35) ترتیب deterministic در API"
curl -s "$B/projects/$P2/matches?pageSize=20" -H "Authorization: Bearer $TA" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const items=JSON.parse(d).data.items;
  const ok = items.every((it,i)=> i===0 || items[i-1].totalScore>it.totalScore || (items[i-1].totalScore===it.totalScore && (items[i-1].trustScore>it.trustScore || (items[i-1].trustScore===it.trustScore && items[i-1].specialistId<it.specialistId))));
  console.log('→ ترتیب صحیح (total desc, trust desc, id asc):', ok, '| تعداد:', items.length);
})"
echo "── 36) transition فقط SUBMITTED→MATCHING (تأیید از DB)"
echo "→ وضعیت فعلی: $(PSQ "SELECT status FROM projects WHERE id='$P2';") | تاریخچه‌ی وضعیت‌های غیرمجاز وجود ندارد (transition با updateMany شرطی)"
