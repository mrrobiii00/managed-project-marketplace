#!/usr/bin/env bash
# Milestone 07 — تست‌های Basic (1-7) + اجرای تطبیق
B=http://127.0.0.1:4000/api/v1
TA=$(cat /tmp/ta); TB=$(cat /tmp/tb); TAD=$(cat /tmp/tad); TSA=$(cat /tmp/t_sA)
P2=$(cat /tmp/p2); P3=$(cat /tmp/p3)
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "── 1) POST matching بدون token"
echo "→ $(code -X POST $B/projects/$P2/matching)  (انتظار 401)"
echo "── 2) SPECIALIST اجرای تطبیق"
echo "→ $(code -X POST $B/projects/$P2/matching -H "Authorization: Bearer $TSA")  (انتظار 403)"
echo "── 3) CLIENT غیرمالک (clientB)"
echo "→ $(code -X POST $B/projects/$P2/matching -H "Authorization: Bearer $TB")  (انتظار 404)"
echo "── 4) پروژه nonexistent"
echo "→ $(code -X POST $B/projects/$(node -e "console.log(require('crypto').randomUUID())")/matching -H "Authorization: Bearer $TA")  (انتظار 404)"
echo "── 5) UUID نامعتبر"
echo "→ $(code -X POST $B/projects/not-uuid/matching -H "Authorization: Bearer $TA")  (انتظار 422)"
echo "── 6) پروژه DRAFT (P3)"
echo "→ $(code -X POST $B/projects/$P3/matching -H "Authorization: Bearer $TA")  (انتظار 409)"
echo "── 7) پروژه SUBMITTED (P2) — اجرای تطبیق"
curl -s -X POST $B/projects/$P2/matching -H "Authorization: Bearer $TA" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  console.log('success:', j.success, '| projectStatus:', j.data.projectStatus, '| candidatesConsidered:', j.data.candidatesConsidered, '| hardFilteredOut:', j.data.hardFilteredOut, '| matches:', j.data.matchesCount);
  for (const m of j.data.items) {
    console.log('  •', m.specialistId.slice(0,8), m.fullName, '| skill:', m.skillScore, '| exp:', m.experienceScore, '| proj:', m.projectScore, '| rate:', m.ratingScore, '| avail:', m.availabilityScore, '| budget:', m.budgetScore, '→ total:', m.totalScore, '| trust:', m.trustScore, '|', m.status);
  }
})"

echo "── 37) اجرای دوباره تطبیق (الان MATCHING)"
echo "→ $(code -X POST $B/projects/$P2/matching -H "Authorization: Bearer $TA")  (انتظار 409)"
echo "── 38) وضعیت نهایی پروژه در DB"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d marketplace -tAc "SELECT status FROM projects WHERE id='$P2';" | sed 's/^/→ status: /'
