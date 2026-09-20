import assert from 'node:assert/strict'
import {
  canTransitionTaskStatus,
  canDeleteTask,
  canStartProject,
  canEditTaskField,
  TASK_EDITABLE_FIELDS,
  isValidIsoDate,
  isDateInPast,
  computeTaskPermissions,
} from '../src/modules/tasks/task.rules'

// ─────────────────────────────────────────────────────────────
// Unit tests قوانین Task — بدون DB (توابع خالص)
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

console.log('━ task.rules — unit tests ━')

// ── Status Transitions ───────────────────────────────────────
console.log('canTransitionTaskStatus:')
test('TODO → IN_PROGRESS مجاز', () => assert.equal(canTransitionTaskStatus('TODO', 'IN_PROGRESS'), true))
test('IN_PROGRESS → DONE مجاز', () => assert.equal(canTransitionTaskStatus('IN_PROGRESS', 'DONE'), true))
test('IN_PROGRESS → TODO مجاز (بازگشت)', () => assert.equal(canTransitionTaskStatus('IN_PROGRESS', 'TODO'), true))
test('TODO → DONE ممنوع (پرش)', () => assert.equal(canTransitionTaskStatus('TODO', 'DONE'), false))
test('DONE → IN_PROGRESS ممنوع (DONE پایانی)', () => assert.equal(canTransitionTaskStatus('DONE', 'IN_PROGRESS'), false))
test('DONE → TODO ممنوع (DONE پایانی)', () => assert.equal(canTransitionTaskStatus('DONE', 'TODO'), false))
test('TODO → TODO (بدون تغییر) مجاز نیست در گذار', () => assert.equal(canTransitionTaskStatus('TODO', 'TODO'), false))

// ── Delete ───────────────────────────────────────────────────
console.log('canDeleteTask:')
test('حذف فقط در TODO', () => {
  assert.equal(canDeleteTask('TODO'), true)
  assert.equal(canDeleteTask('IN_PROGRESS'), false)
  assert.equal(canDeleteTask('DONE'), false)
})

// ── Start Project ────────────────────────────────────────────
console.log('canStartProject:')
test('شروع فقط از TEAM_PROPOSED', () => {
  assert.equal(canStartProject('TEAM_PROPOSED'), true)
  assert.equal(canStartProject('SUBMITTED'), false)
  assert.equal(canStartProject('IN_PROGRESS'), false)
  assert.equal(canStartProject('REVIEW'), false)
})

// ── Role-based editable fields ───────────────────────────────
console.log('TASK_EDITABLE_FIELDS / canEditTaskField:')
test('ADMIN: همه‌ی فیلدها + status', () => {
  for (const f of ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'status']) {
    assert.equal(canEditTaskField('ADMIN', f), true)
  }
})
test('CLIENT: فیلدها بدون status', () => {
  assert.equal(canEditTaskField('CLIENT', 'title'), true)
  assert.equal(canEditTaskField('CLIENT', 'assignedTo'), true)
  assert.equal(canEditTaskField('CLIENT', 'status'), false)
})
test('SPECIALIST: فقط status', () => {
  assert.equal(canEditTaskField('SPECIALIST', 'status'), true)
  for (const f of ['title', 'description', 'priority', 'dueDate', 'assignedTo']) {
    assert.equal(canEditTaskField('SPECIALIST', f), false)
  }
})
test('فیلدهای حساس (projectId/teamId/id) برای هیچ نقشی قابل ویرایش نیستند', () => {
  for (const role of ['ADMIN', 'CLIENT', 'SPECIALIST'] as const) {
    for (const f of ['projectId', 'teamId', 'id', 'createdAt', 'updatedAt']) {
      assert.equal(TASK_EDITABLE_FIELDS[role].includes(f), false)
    }
  }
})

// ── Date validation ──────────────────────────────────────────
console.log('isValidIsoDate / isDateInPast:')
test('تاریخ معتبر پذیرفته می‌شود', () => {
  assert.equal(isValidIsoDate('2027-10-15'), true)
  assert.equal(isValidIsoDate('2026-02-29'), false) // 2026 کبیسه نیست
  assert.equal(isValidIsoDate('2028-02-29'), true) // 2028 کبیسه است
})
test('تاریخ جعلی 2026-02-30 رد می‌شود (round-trip)', () => assert.equal(isValidIsoDate('2026-02-30'), false))
test('فرمت غلط رد می‌شود', () => {
  assert.equal(isValidIsoDate('15/10/2026'), false)
  assert.equal(isValidIsoDate('2026-1-5'), false)
  assert.equal(isValidIsoDate(''), false)
})
test('تشخیص گذشته: 2020-01-01 گذشته است، 2100-01-01 نه', () => {
  assert.equal(isDateInPast('2020-01-01'), true)
  assert.equal(isDateInPast('2100-01-01'), false)
})

// ── Permission matrix ────────────────────────────────────────
console.log('computeTaskPermissions:')
test('ADMIN → دسترسی کامل', () => {
  const p = computeTaskPermissions({ role: 'ADMIN', isProjectOwner: false, isTeamMember: false, isAssignee: false })
  assert.deepEqual(p, { canView: true, canCreate: true, canDelete: true, canChangeStatus: true, restrictedToStatusOnly: false })
})
test('CLIENT مالک → همه به‌جز status؛ حذف مجاز', () => {
  const p = computeTaskPermissions({ role: 'CLIENT', isProjectOwner: true, isTeamMember: false, isAssignee: false })
  assert.equal(p.canCreate, true)
  assert.equal(p.canDelete, true)
  assert.equal(p.canChangeStatus, false)
  assert.equal(p.restrictedToStatusOnly, false)
})
test('CLIENT غیرمالک → هیچ', () => {
  const p = computeTaskPermissions({ role: 'CLIENT', isProjectOwner: false, isTeamMember: false, isAssignee: false })
  assert.equal(p.canView, false)
})
test('SPECIALIST عضو + assignee → فقط status', () => {
  const p = computeTaskPermissions({ role: 'SPECIALIST', isProjectOwner: false, isTeamMember: true, isAssignee: true })
  assert.equal(p.canView, true)
  assert.equal(p.canCreate, true)
  assert.equal(p.canDelete, false)
  assert.equal(p.canChangeStatus, true)
  assert.equal(p.restrictedToStatusOnly, true)
})
test('SPECIALIST عضو ولی غیرassignee → status هم ممنوع', () => {
  const p = computeTaskPermissions({ role: 'SPECIALIST', isProjectOwner: false, isTeamMember: true, isAssignee: false })
  assert.equal(p.canView, true)
  assert.equal(p.canChangeStatus, false)
  assert.equal(p.canDelete, false)
})
test('SPECIALIST غیرعضو → هیچ (404 در Service)', () => {
  const p = computeTaskPermissions({ role: 'SPECIALIST', isProjectOwner: false, isTeamMember: false, isAssignee: false })
  assert.equal(p.canView, false)
  assert.equal(p.canCreate, false)
})

console.log(`━ نتیجه: ${passed} موفق / ${failed} ناموفق ━`)
if (failed > 0) process.exit(1)
