// routes/authRoutes.js
import express from 'express'
import {
  login,
  registerUser,
  registerAdmin,
  registerCounselor,
  getProfile,
  updateProfile,
  createGuestUser,
} from '../controllers/userController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.post('/login', login)
router.post('/register', registerUser)
router.post('/register/admin', registerAdmin)
router.post('/register/counselor', registerCounselor)
router.post('/guest', createGuestUser)

// Protected routes
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)

export default router
