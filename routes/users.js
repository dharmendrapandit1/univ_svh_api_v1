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
router.get('/verify-token', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    isAuthenticated: true,
  })
})

router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('token')
  res.json({ success: true, message: 'Logged out successfully' })
})

// Protected routes
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)

export default router
