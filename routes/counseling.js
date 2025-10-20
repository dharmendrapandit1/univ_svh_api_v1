import express from 'express'
import {
  createCounselingRequest,
  getCounselingSessions,
  updateCounselingSession,
  addCounselingFeedback,
} from '../controllers/counselingController.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

router
  .route('/')
  .post(authenticate, createCounselingRequest)
  .get(authenticate, getCounselingSessions)

router.route('/:id').put(authenticate, updateCounselingSession)

router.route('/:id/feedback').post(authenticate, addCounselingFeedback)

export default router
