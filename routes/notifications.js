import express from 'express'
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
} from '../controllers/notificationController.js'
import { authenticate } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'

const router = express.Router()

router.route('/')
    .get(getAllNotifications)
    .post(authenticate, requireAdmin, createNotification)

router.route('/:id')
    .delete(authenticate, requireAdmin, deleteNotification)

export default router
