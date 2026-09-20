#!/usr/bin/env bash
# Milestone 08 — تست‌های 1-49 (Review / Match Decision / Team)
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TB=$(cat /tmp/tb); TAD=$(cat /tmp/tad); TSA=$(cat /tmp/t_sA); TSH=$(cat /tmp/t_sH)
P2=$(cat /tmp/p2); P3=$(cat /tmp/p3)
REACT=$(cat /tmp/react); NODE=$(cat /tmp/node); DOCKER=$(curl -s "$B/skills?search=Docker" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.items[0].id))")
PSQ() { PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "$1"; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
IDA() { PSQ "SELECT id FROM users WHERE email='m7-speca@example.com'"; }
IDB() { PSQ "SELECT id FROM users WHERE email='m7-specb@example.com'"; }
IDC() { PSQ "SELECT id FROM users WHERE email='m7-specc@example.com'"; }
IDE() { PSQ "SELECT id FROM users WHERE email='m7-spece@example.com'"; }
IDG() { PSQ "SELECT id FROM users WHERE email='m7-specg@example.com'"; }
IDH() { PSQ "SELECT id FROM users WHERE email='m7-spech@example.com'"; }
IDJ() { PSQ "SELECT id FROM users WHERE email='m7-specj@example.com'"; }
CBID() { PSQ "SELECT id FROM users WHERE email='m7-clientb@example.com'"; }

echo "═══ فاز 0: ساخت P4 (SUBMITTED) ═══"
P4=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"پروژه چهارم تست\",\"description\":\"پروژه‌ای در وضعیت SUBMITTED برای تست‌های بررسی\",\"minBudget\":10000000,\"maxBudget\":20000000,\"deadline\":\"2027-12-01\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1}]}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X POST $B/projects/$P4/submit -H "Authorization: Bearer $TA"
echo "P4=$(PSQ "SELECT status FROM projects WHERE id='$P4'")"

echo "═══ Review (1-8) ═══"
echo "1) MATCHING→REVIEW (P2): $(code -X POST $B/admin/projects/$P2/review -H "Authorization: Bearer $TAD") | status: $(PSQ "SELECT status FROM projects WHERE id='$P2'")"
echo "2) DRAFT→REVIEW (P3): $(code -X POST $B/admin/projects/$P3/review -H "Authorization: Bearer $TAD") (انتظار 409)"
echo "3) SUBMITTED→REVIEW (P4): $(code -X POST $B/admin/projects/$P4/review -H "Authorization: Bearer $TAD") (انتظار 409)"
echo "4) Client review: $(code -X POST $B/admin/projects/$P4/review -H "Authorization: Bearer $TA") (انتظار 403)"
echo "5) Specialist review: $(code -X POST $B/admin/projects/$P4/review -H "Authorization: Bearer $TSA") (انتظار 403)"
echo "6) Admin دوباره (الان REVIEW→409 چون فقط از MATCHING): $(code -X POST $B/admin/projects/$P2/review -H "Authorization: Bearer $TAD") (انتظار 409 — P2 الان REVIEW است؛ تست 1 خودش موفق بود)"
echo "7) nonexistent: $(code -X POST $B/admin/projects/$(node -e "console.log(require('crypto').randomUUID())")/review -H "Authorization: Bearer $TAD") (انتظار 404)"
echo "8) UUID نامعتبر: $(code -X POST $B/admin/projects/abc/review -H "Authorization: Bearer $TAD") (انتظار 422)"

echo "═══ Admin Matches API (3) ═══"
curl -s "$B/admin/projects/$P2/matches?pageSize=3" -H "Authorization: Bearer $TAD" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  console.log('→ total:', j.data.total, '| صفحه اول:', j.data.items.map(i=>i.fullName+':'+i.scores.totalScore).join(' , '));
  console.log('→ مهارت‌های اولین نفر:', j.data.items[0].skills.map(s=>s.name+'('+s.level+')').join(','));
})"
echo "→ non-admin روی admin matches: $(code "$B/admin/projects/$P2/matches" -H "Authorization: Bearer $TA") (انتظار 403)"

echo "═══ Match Decision (9-16) ═══"
echo "9) approve specA (RECOMMENDED): $(code -X PUT $B/admin/projects/$P2/matches/$(IDA) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}')"
echo "10) approve specB (NEEDS_REVIEW): $(code -X PUT $B/admin/projects/$P2/matches/$(IDB) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}')"
echo "11) reject specH: $(code -X PUT $B/admin/projects/$P2/matches/$(IDH) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"REJECT"}') → status: $(PSQ "SELECT status FROM matches WHERE project_id='$P2' AND specialist_id='$(IDH)'")"
echo "12) reject دوباره specH: $(code -X PUT $B/admin/projects/$P2/matches/$(IDH) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"REJECT"}') (انتظار 409)"
echo "12b) approve روی REJECTED (specG از موتور): $(code -X PUT $B/admin/projects/$P2/matches/$(IDG) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}') (انتظار 409)"
echo "13) match ناموجود: $(code -X PUT $B/admin/projects/$P2/matches/$(node -e "console.log(require('crypto').randomUUID())") -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}') (انتظار 404)"
echo "14) Client decision: $(code -X PUT $B/admin/projects/$P2/matches/$(IDA) -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}') (انتظار 403)"
echo "15) Specialist decision: $(code -X PUT $B/admin/projects/$P2/matches/$(IDA) -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}') (انتظار 403)"
echo "16) match پروژه دیگر (P3 بدون match): $(code -X PUT $B/admin/projects/$P3/matches/$(IDA) -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d '{"decision":"APPROVE"}') (انتظار 404)"
echo "16b) تأیید: هیچ عضو تیمی ساخته نشده: $(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE t.project_id='$P2';") (انتظار 0 — Approve ≠ Membership)"

echo "═══ Team failure tests (18-30) — P2 هنوز REVIEW ═══"
TEAMBODY="{\"name\":\"تیم فروشگاه اینترنتی\",\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"Backend Developer\"},{\"specialistId\":\"$(IDB)\",\"role\":\"Frontend Developer\"}]}"
echo "18) create در DRAFT (P3): $(code -X POST $B/admin/projects/$P3/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$TEAMBODY") (انتظار 409)"
echo "19) create در SUBMITTED (P4): $(code -X POST $B/admin/projects/$P4/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$TEAMBODY") (انتظار 409)"
echo "20) توسط Client: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "$TEAMBODY") (انتظار 403)"
echo "21) توسط Specialist: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TSA" -H 'Content-Type: application/json' -d "$TEAMBODY") (انتظار 403)"
echo "22) specialist ناموجود: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(node -e "console.log(require('crypto').randomUUID())")\",\"role\":\"Backend Developer\"}]}") (انتظار 404)"
echo "23) CLIENT به‌عنوان عضو: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(CBID)\",\"role\":\"Backend Developer\"}]}") (انتظار 422)"
echo "24) specialist غیرفعال (specE): $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDE)\",\"role\":\"Backend Developer\"}]}") (انتظار 422)"
echo "25) بدون match (specC فیلترشده): $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDC)\",\"role\":\"Backend Developer\"}]}") (انتظار 409)"
echo "26) match ردشده (specG): $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDG)\",\"role\":\"Backend Developer\"}]}") (انتظار 409)"
echo "27) عضو تکراری: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"Backend Developer\"},{\"specialistId\":\"$(IDA)\",\"role\":\"Frontend Developer\"}]}") (انتظار 422)"
echo "28) نقش خارج از تعریف: $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"DevOps Engineer\"}]}") (انتظار 422)"
echo "29) بیشتر از ظرفیت نقش (FE qty=1، دو نفر): $(code -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم تست\",\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"Frontend Developer\"},{\"specialistId\":\"$(IDB)\",\"role\":\"Frontend Developer\"}]}") (انتظار 422)"
echo "36a) پس از همه‌ی شکست‌ها: تیم P2= $(PSQ "SELECT count(*) FROM teams WHERE project_id='$P2';") | اعضا= $(PSQ "SELECT count(*) FROM team_members tm JOIN teams t ON t.id=tm.team_id WHERE t.project_id='$P2';") | وضعیت P2= $(PSQ "SELECT status FROM projects WHERE id='$P2'") (انتظار 0/0/REVIEW — بدون وضعیت ناقص)"

echo "═══ پوشش مهارت الزادی (30) — با P5 و match تزریقی SQL ═══"
P5=$(curl -s -X POST $B/projects -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "{\"title\":\"پروژه داکر\",\"description\":\"پروژه‌ای با مهارت الزادی که هیچ متخصصی ندارد\",\"minBudget\":10000000,\"maxBudget\":20000000,\"deadline\":\"2027-12-01\",\"skills\":[{\"skillId\":\"$REACT\",\"isRequired\":true},{\"skillId\":\"$DOCKER\",\"isRequired\":true}],\"roles\":[{\"roleName\":\"Frontend Developer\",\"quantity\":1}]}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.id))")
curl -s -o /dev/null -X POST $B/projects/$P5/submit -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X POST $B/projects/$P5/matching -H "Authorization: Bearer $TA"
curl -s -o /dev/null -X POST $B/admin/projects/$P5/review -H "Authorization: Bearer $TAD"
PSQ "INSERT INTO matches (id, project_id, specialist_id, skill_score, experience_score, project_score, rating_score, availability_score, budget_score, total_score, trust_score, status) VALUES (gen_random_uuid(), '$P5', '$(IDA)', 50,50,50,50,50,50, 50, 50, 'NEEDS_REVIEW');" > /dev/null
echo "P5=$(PSQ "SELECT status FROM projects WHERE id='$P5'") + match تزریقی برای specA (بدون Docker)"
echo "30) پوشش ناقص: $(curl -s -X POST $B/admin/projects/$P5/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "{\"name\":\"تیم داکر\",\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"Frontend Developer\"}]}" -o /tmp/cov.json -w '%{http_code}') (انتظار 422) — $(cat /tmp/cov.json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).message))")"

echo "═══ Team success (17, 31-35) ═══"
curl -s -X POST $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$TEAMBODY" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const t=j.data;
  console.log('17/31) ایجاد:', j.success, '| نام:', t.name, '| status:', t.status, '| teamScore:', t.teamScore);
  console.log('32) اعضا:', t.members.map(m=>m.fullName+'('+m.role+', score:'+m.matchScore+')').join(' , '));
})"
echo "33) matchScoreهای ذخیره‌شده در DB: $(PSQ "SELECT m.role||'='||m.match_score FROM team_members tm JOIN teams t ON t.id=tm.team_id JOIN team_members m ON m.id=tm.id WHERE t.project_id='$P2' LIMIT 0;" 2>/dev/null; PSQ "SELECT string_agg(role||':'||match_score, ' | ') FROM team_members WHERE team_id=(SELECT id FROM teams WHERE project_id='$P2');") (انتظار 97.5 و 72.5)"
echo "34) teamScore در DB: $(PSQ "SELECT team_score FROM teams WHERE project_id='$P2';") (انتظار 85.00 = میانگین 97.5 و 72.5)"
echo "35) وضعیت پروژه: $(PSQ "SELECT status FROM projects WHERE id='$P2'") (انتظار TEAM_PROPOSED)"
echo "37) رکورد یتیم: teams بی‌پروژه=$(PSQ "SELECT count(*) FROM teams t LEFT JOIN projects p ON p.id=t.project_id WHERE p.id IS NULL;") | members بی‌تیم=$(PSQ "SELECT count(*) FROM team_members tm LEFT JOIN teams t ON t.id=tm.team_id WHERE t.id IS NULL;") (انتظار 0 و 0)"

echo "═══ Team Read (38-43) ═══"
echo "38) ادمین: $(code "$B/projects/$P2/team" -H "Authorization: Bearer $TAD")"
echo "39) مالک: $(code "$B/projects/$P2/team" -H "Authorization: Bearer $TA")"
echo "40) عضو (specA): $(code "$B/projects/$P2/team" -H "Authorization: Bearer $TSA")"
echo "41) متخصص بی‌ربط (specH): $(code "$B/projects/$P2/team" -H "Authorization: Bearer $TSH") (انتظار 404)"
echo "42) clientB بی‌ربط: $(code "$B/projects/$P2/team" -H "Authorization: Bearer $TB") (انتظار 404)"
echo "42b) پروژه بدون تیم (P3): $(code "$B/projects/$P3/team" -H "Authorization: Bearer $TA") (انتظار 404)"
curl -s "$B/projects/$P2/team" -H "Authorization: Bearer $TA" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const s=JSON.stringify(JSON.parse(d));
  console.log('43) داده حساس در پاسخ تیم؟', /\"email\"|passwordHash/i.test(s), '(انتظار false)');
})"

echo "═══ Team Update (44-49) ═══"
UPDBODY="{\"members\":[{\"specialistId\":\"$(IDA)\",\"role\":\"Backend Developer\"},{\"specialistId\":\"$(IDJ)\",\"role\":\"Frontend Developer\"}]}"
curl -s -X PUT $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$UPDBODY" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const t=JSON.parse(d).data;
  console.log('44) ویرایش تیم PROPOSED:', JSON.parse(d).success, '| اعضا:', t.members.map(m=>m.fullName+'('+m.role+')').join(' , '));
  console.log('45) جایگزینی اتمی: specB حذف شد؟', !t.members.some(m=>m.fullName==='بابک صادقی'), '| تعداد:', t.members.length);
  console.log('46) teamScore جدید:', t.teamScore, '(انتظار 83.75 = میانگین 97.5 و 70)');
})"
PSQ "UPDATE teams SET status='ACTIVE' WHERE project_id='$P2';" > /dev/null
echo "47) ویرایش ACTIVE: $(code -X PUT $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$UPDBODY") (انتظار 409)"
PSQ "UPDATE teams SET status='COMPLETED' WHERE project_id='$P2';" > /dev/null
echo "48) ویرایش COMPLETED: $(code -X PUT $B/admin/projects/$P2/team -H "Authorization: Bearer $TAD" -H 'Content-Type: application/json' -d "$UPDBODY") (انتظار 409)"
PSQ "UPDATE teams SET status='PROPOSED' WHERE project_id='$P2';" > /dev/null
echo "49) ویرایش توسط غیرادمین: $(code -X PUT $B/admin/projects/$P2/team -H "Authorization: Bearer $TA" -H 'Content-Type: application/json' -d "$UPDBODY") (انتظار 403)"
echo "═══ M08 COMPLETE ═══"
