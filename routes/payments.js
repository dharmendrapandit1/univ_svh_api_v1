import express from 'express'
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getPaymentHistory,
} from '../controllers/paymentController.js'
import { authenticate } from '../middleware/auth.js'
import {
  validateOrderItems,
  validatePaymentVerification,
} from '../middleware/validation.js'

const router = express.Router()

// Apply authentication to all routes except webhook
router
  .route('/create-order')
  .post(authenticate, validateOrderItems, createOrder)

router
  .route('/verify')
  .post(authenticate, validatePaymentVerification, verifyPayment)

router.route('/status/:orderId').get(authenticate, getPaymentStatus)

router.route('/history').get(authenticate, getPaymentHistory)

// Webhook route - no authentication, raw body required
router
  .route('/webhook')
  .post(express.raw({ type: 'application/json' }), handleWebhook)

// Optional: Add a route to get payment by ID
router.route('/:paymentId').get(authenticate, async (req, res) => {
  // You can implement this if needed
  res.status(501).json({
    success: false,
    message: 'Get payment by ID not implemented yet',
  })
})

export default router
