import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import * as taskController from './task.controller'

const router = Router()

// مجوزهای نقش‌محور (مالک/عضو/ادمین) داخل Service بررسی می‌شوند — غیرمرتبط 404
router.post('/:projectId/tasks', requireAuth, taskController.createTask)
router.get('/:projectId/tasks', requireAuth, taskController.listTasks)
router.get('/:projectId/tasks/:taskId', requireAuth, taskController.getTask)
router.put('/:projectId/tasks/:taskId', requireAuth, taskController.updateTask)
router.delete('/:projectId/tasks/:taskId', requireAuth, taskController.deleteTask)

export { router as taskRouter }
