import express from 'express'
import {
  submitContact,
  getMessages,
  updateStatus,
  deleteMessage,
  addNote,
} from '../controllers/contactController.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

router.route('/').post(submitContact).get(authenticate, authorize('admin'), getMessages)
router.route('/:id').delete(authenticate, authorize('admin'), deleteMessage)
router.route('/:id/status').put(authenticate, authorize('admin'), updateStatus)
router.route('/:id/note').put(authenticate, authorize('admin'), addNote)

export default router
