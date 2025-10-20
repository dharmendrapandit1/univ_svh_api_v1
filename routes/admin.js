import express from 'express'
import {
  getDashboardStats,
  getUsers,
  getUserById,
  updateUser,
  getCourseById,
  deleteUser,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  bulkActionCourses,
  getOrders,
  updateOrder,
  getCounselingSessions,
  updateCounselingSession,
  getAdminNotes,
  createNote,
  updateNote,
  deleteNote,
  getContactMessages,
} from '../controllers/adminController.js'

import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(authorize('admin'))

// Dashboard
router.route('/dashboard').get(getDashboardStats)

// Users Management
router.route('/users').get(getUsers)
router.route('/users/:id').get(getUserById).put(updateUser).delete(deleteUser)

// Courses Management
router.route('/courses').get(getAdminCourses).post(createCourse)

router
  .route('/courses/:id')
  .get(getCourseById)
  .put(updateCourse)
  .delete(deleteCourse)

router.route('/courses/bulk-action').post(bulkActionCourses)

// Orders Management
router.route('/orders').get(getOrders)
router.route('/orders/:id').put(updateOrder)

// Counseling Management
router.route('/counseling').get(getCounselingSessions)
router.route('/counseling/:id').put(updateCounselingSession)

// Notes Management
router.route('/notes').get(getAdminNotes).post(createNote)

router.route('/notes/:id').put(updateNote).delete(deleteNote)

// Contact Messages
router.route('/contact').get(getContactMessages)

export default router
