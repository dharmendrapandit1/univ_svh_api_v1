import express from 'express'
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourseProgress,
} from '../controllers/courseController.js'
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js'

const router = express.Router()

router
  .route('/')
  .get(optionalAuth, getCourses)
  .post(authenticate, authorize('admin'), createCourse)

router.route('/:id').get(optionalAuth, getCourse)

router.route('/:id/progress').post(authenticate, updateCourseProgress)

export default router
