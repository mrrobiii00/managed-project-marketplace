import assert from 'node:assert/strict'
import {
  isValidRatingScore,
  isSelfRating,
  resolveRaterType,
} from '../src/modules/ratings/rating.rules'
import {
  calculateRatingScore,
  calculateProjectScore,
  calculateTrustScore,
} from '../src/modules/matching/matching.engine'
import { getUserReputation } from '../src/modules/ratings/reputation.service'

// ─────────────────────────────────────────────────────────────
// Unit tests قوانین Rating/Reputation — توابع خالص بدون DB
// (بخش reputation محاسباتیِ فرمول با مقادیر نمونه تست می‌شود؛
//  خود سرویس DB-dependent است و در integration پوشش داده شده)
// اجرا: npm run test:unit
// ─────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
function test(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}\n    → ${(e as Error).message}`)
  }
}
// helper محاسبه‌ی فرمول Reputation (همان منطق سرویس — بدون DB)
function computeReputation(scores: number[], completed: number) {
  const averageRating = scores.length === 0 ? null : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
  const ratingCount = scores.length
  const trustScore = calculateTrustScore(averageRating, completed)
  return { averageRating, ratingCount, completedProjects: completed, trustScore }
}

console.log('━ rating.rules + reputation — unit tests ━')

console.log('isValidRatingScore:')
test('۱ تا ۵ صحیح قبول', () => {
  for (const s of [1, 2, 3, 4, 5]) assert.equal(isValidRatingScore(s), true)
})
test('۰ و ۶ و اعشاری و رشته رد می‌شوند', () => {
  assert.equal(isValidRatingScore(0), false)
  assert.equal(isValidRatingScore(6), false)
  assert.equal(isValidRatingScore(3.5), false)
  assert.equal(isValidRatingScore('5'), false)
})

console.log('isSelfRating:')
test('from === to → true', () => {
  assert.equal(isSelfRating('u1', 'u1'), true)
  assert.equal(isSelfRating('u1', 'u2'), false)
})

console.log('resolveRaterType (ماتریس مجوز ارزیابی):')
test('CLIENT مالک → CLIENT_OWNER', () => {
  assert.equal(resolveRaterType('CLIENT', true, false), 'CLIENT_OWNER')
})
test('SPECIALIST عضو → TEAM_MEMBER', () => {
  assert.equal(resolveRaterType('SPECIALIST', false, true), 'TEAM_MEMBER')
})
test('ADMIN → null (طرف پروژه نیست)', () => {
  assert.equal(resolveRaterType('ADMIN', false, false), null)
})
test('CLIENT غیرمالک → null | SPECIALIST غیرعضو → null', () => {
  assert.equal(resolveRaterType('CLIENT', false, false), null)
  assert.equal(resolveRaterType('SPECIALIST', false, false), null)
})

console.log('calculateRatingScore (M07):')
test('میانگین×۲۰ — 4.5→90 | null→50 (cold-start)', () => {
  assert.equal(calculateRatingScore(4.5), 90)
  assert.equal(calculateRatingScore(null), 50)
})

console.log('calculateProjectScore (M07 — mapping حفظ‌شده):')
test('0→0 · 1→40 · 2→70 · 3→90 · 4+→100', () => {
  assert.equal(calculateProjectScore(0), 0)
  assert.equal(calculateProjectScore(1), 40)
  assert.equal(calculateProjectScore(2), 70)
  assert.equal(calculateProjectScore(3), 90)
  assert.equal(calculateProjectScore(6), 100)
})

console.log('calculateTrustScore (سازگاری M07):')
test('cold-start (بدون رتبه و پروژه) → 50', () => {
  assert.equal(calculateTrustScore(null, 0), 50)
})
test('(5, 4+) → 100', () => assert.equal(calculateTrustScore(5, 4), 100))
test('(4, 0) → 0.7×80+0.3×0 = 56', () => assert.equal(calculateTrustScore(4, 0), 56))

console.log('computeReputation (فرمول کامل):')
test('کاربر بدون رتبه/پروژه → avg null, count 0, trust 50', () => {
  const r = computeReputation([], 0)
  assert.deepEqual(r, { averageRating: null, ratingCount: 0, completedProjects: 0, trustScore: 50 })
})
test('میانگین درست: [5,4,4] → 4.33', () => {
  const r = computeReputation([5, 4, 4], 2)
  assert.equal(r.averageRating, 4.33)
  assert.equal(r.ratingCount, 3)
})
test('trust نمونه: avg=5 (ratingScore 100)، completed=6 (100) → 100', () => {
  assert.equal(computeReputation([5, 5], 6).trustScore, 100)
})
test('trust نمونه: avg=4، completed=0 → 56', () => {
  assert.equal(computeReputation([4], 0).trustScore, 56)
})
test('rounding دو رقم اعشار: [3,4] → avg 3.5 → ratingScore 70؛ completed=1 (40) → 0.7×70+0.3×40=61', () => {
  assert.equal(computeReputation([3, 4], 1).trustScore, 61)
})

console.log('getUserReputation (سرویس — فقط type-level بدون DB در unit):')
test('نام فایل سرویس صادر می‌شود (سنجش intégration جداگانه)', () => {
  assert.equal(typeof getUserReputation, 'function')
})

console.log(`━ نتیجه: ${passed} موفق / ${failed} ناموفق ━`)
if (failed > 0) process.exit(1)
