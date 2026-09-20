import assert from 'node:assert/strict'
import {
  calculateSkillScore,
  calculateExperienceScore,
  calculateProjectScore,
  calculateRatingScore,
  calculateAvailabilityScore,
  calculateBudgetScore,
  calculateTotalScore,
  calculateTrustScore,
  determineRecommendationStatus,
} from '../src/modules/matching/matching.engine'

// ─────────────────────────────────────────────────────────────
// Unit tests موتور تطبیق — کاملاً بدون DB (توابع خالص)
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

console.log('━ matching.engine — unit tests ━')

// ── Skill Score ──────────────────────────────────────────────
console.log('calculateSkillScore:')
test('هر دو مهارت الزادی EXPERT → 100', () => {
  const r = calculateSkillScore(
    [
      { skillId: 'a', isRequired: true },
      { skillId: 'b', isRequired: true },
    ],
    new Map([
      ['a', 'EXPERT'],
      ['b', 'EXPERT'],
    ] as Map<string, never>),
  )
  assert.equal(r.score, 100)
})
test('EXPERT + BEGINNER الزامی → (100×3+25×3)/6 = 62.5', () => {
  const r = calculateSkillScore(
    [
      { skillId: 'a', isRequired: true },
      { skillId: 'b', isRequired: true },
    ],
    new Map([
      ['a', 'EXPERT'],
      ['b', 'BEGINNER'],
    ] as Map<string, never>),
  )
  assert.equal(r.score, 62.5)
  assert.equal(r.matchedRequired, 2)
})
test('مهارت اختیاریِ موجود امتیاز را بالا می‌برد: +EXPERT اختیاری → 475/7=67.86', () => {
  const r = calculateSkillScore(
    [
      { skillId: 'a', isRequired: true },
      { skillId: 'b', isRequired: true },
      { skillId: 'c', isRequired: false },
    ],
    new Map([
      ['a', 'EXPERT'],
      ['b', 'BEGINNER'],
      ['c', 'EXPERT'],
    ] as Map<string, never>),
  )
  assert.equal(r.score, 67.86)
  assert.equal(r.matchedOptional, 1)
})
test('مهارت اختیاریِ غایب امتیاز را پایین می‌آورد (وزنش در مخرج می‌ماند)', () => {
  const r = calculateSkillScore(
    [
      { skillId: 'a', isRequired: true },
      { skillId: 'c', isRequired: false },
    ],
    new Map([['a', 'EXPERT']] as Map<string, never>),
  )
  assert.equal(r.score, 75) // 100×3 / (3+1)
})
test('پروژه بدون مهارت → 50 (خنثی، مستند)', () => {
  assert.equal(calculateSkillScore([], new Map()).score, 50)
})
test('داشتن سطح بالاتر امتیاز بالاتر (ترتیب قطعی سطوح)', () => {
  const mk = (level: string) =>
    calculateSkillScore([{ skillId: 'a', isRequired: true }], new Map([['a', level as never]]))
  assert.ok(mk('EXPERT').score > mk('ADVANCED').score)
  assert.ok(mk('ADVANCED').score > mk('INTERMEDIATE').score)
  assert.ok(mk('INTERMEDIATE').score > mk('BEGINNER').score)
  assert.equal(mk('BEGINNER').score, 25)
})

// ── Experience Score ─────────────────────────────────────────
console.log('calculateExperienceScore:')
test('mapping: null→20, 0→20, 1→20, 2→40, 3→40', () => {
  assert.equal(calculateExperienceScore(null), 20)
  assert.equal(calculateExperienceScore(0), 20)
  assert.equal(calculateExperienceScore(1), 20)
  assert.equal(calculateExperienceScore(2), 40)
  assert.equal(calculateExperienceScore(3), 40)
})
test('mapping: 4→60, 5→60, 6→80, 8→80, 9→100, 20→100', () => {
  assert.equal(calculateExperienceScore(4), 60)
  assert.equal(calculateExperienceScore(5), 60)
  assert.equal(calculateExperienceScore(6), 80)
  assert.equal(calculateExperienceScore(8), 80)
  assert.equal(calculateExperienceScore(9), 100)
  assert.equal(calculateExperienceScore(20), 100)
})

// ── Project Score ────────────────────────────────────────────
console.log('calculateProjectScore:')
test('mapping: 0→0, 1→40, 2→70, 3→90, 4→100, 7→100', () => {
  assert.equal(calculateProjectScore(0), 0)
  assert.equal(calculateProjectScore(1), 40)
  assert.equal(calculateProjectScore(2), 70)
  assert.equal(calculateProjectScore(3), 90)
  assert.equal(calculateProjectScore(4), 100)
  assert.equal(calculateProjectScore(7), 100)
})

// ── Rating Score ─────────────────────────────────────────────
console.log('calculateRatingScore:')
test('null → 50 (cold-start)', () => assert.equal(calculateRatingScore(null), 50))
test('1→20, 3→60, 4.5→90, 5→100', () => {
  assert.equal(calculateRatingScore(1), 20)
  assert.equal(calculateRatingScore(3), 60)
  assert.equal(calculateRatingScore(4.5), 90)
  assert.equal(calculateRatingScore(5), 100)
})

// ── Availability / Budget ────────────────────────────────────
console.log('calculateAvailabilityScore / calculateBudgetScore:')
test('AVAILABLE→100, BUSY→50, null→50', () => {
  assert.equal(calculateAvailabilityScore('AVAILABLE'), 100)
  assert.equal(calculateAvailabilityScore('BUSY'), 50)
  assert.equal(calculateAvailabilityScore(null), 50)
})
test('budget همیشه 50 (خنثی deterministic — محدودیت مستند)', () => {
  assert.equal(calculateBudgetScore(), 50)
})

// ── Total ────────────────────────────────────────────────────
console.log('calculateTotalScore:')
test('همه اجزا 100 → 100', () => {
  const c = {
    skillScore: 100, experienceScore: 100, projectScore: 100,
    ratingScore: 100, availabilityScore: 100, budgetScore: 100,
  }
  assert.equal(calculateTotalScore(c), 100)
})
test('مثال وزنی: (25,20,0,50,50,50) → 26.5', () => {
  const c = {
    skillScore: 25, experienceScore: 20, projectScore: 0,
    ratingScore: 50, availabilityScore: 50, budgetScore: 50,
  }
  assert.equal(calculateTotalScore(c), 26.5)
})
test('نمونه واقعی specA: (85.71,100,100,100,100,50) → 91.78', () => {
  const c = {
    skillScore: 85.71, experienceScore: 100, projectScore: 100,
    ratingScore: 100, availabilityScore: 100, budgetScore: 50,
  }
  assert.equal(calculateTotalScore(c), 91.78)
})

// ── Trust ────────────────────────────────────────────────────
console.log('calculateTrustScore:')
test('cold-start (بدون رتبه و پروژه) → 50', () => {
  assert.equal(calculateTrustScore(null, 0), 50)
})
test('(5, 4+) → 100', () => assert.equal(calculateTrustScore(5, 4), 100))
test('(null, 2) → 0.7×50+0.3×70 = 56', () => assert.equal(calculateTrustScore(null, 2), 56))
test('(4, 1) → 0.7×80+0.3×40 = 68', () => assert.equal(calculateTrustScore(4, 1), 68))
test('(3, 0) → 42', () => assert.equal(calculateTrustScore(3, 0), 42))

// ── Recommendation ───────────────────────────────────────────
console.log('determineRecommendationStatus:')
test('total≥85 و trust≥80 → RECOMMENDED', () => {
  assert.equal(determineRecommendationStatus(85, 80), 'RECOMMENDED')
  assert.equal(determineRecommendationStatus(95, 95), 'RECOMMENDED')
})
test('total 70..84 → NEEDS_REVIEW (حتی با trust بالا)', () => {
  assert.equal(determineRecommendationStatus(84.99, 90), 'NEEDS_REVIEW')
  assert.equal(determineRecommendationStatus(70, 50), 'NEEDS_REVIEW')
})
test('total≥85 ولی trust<80 → NEEDS_REVIEW (auto نیازمند اعتماد)', () => {
  assert.equal(determineRecommendationStatus(90, 79.99), 'NEEDS_REVIEW')
})
test('total<70 → REJECTED', () => {
  assert.equal(determineRecommendationStatus(69.99, 100), 'REJECTED')
  assert.equal(determineRecommendationStatus(0, 0), 'REJECTED')
})
test('hard-filter ناموفق → REJECTED', () => {
  assert.equal(determineRecommendationStatus(90, 90, false), 'REJECTED')
})

console.log(`━ نتیجه: ${passed} موفق / ${failed} ناموفق ━`)
if (failed > 0) process.exit(1)
