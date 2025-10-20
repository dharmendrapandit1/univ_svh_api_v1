import dotenv from 'dotenv'
dotenv.config()
import Razorpay from 'razorpay'

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    'Razorpay environment variables are missing. Please check your .env file'
  )
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export const createRazorpayOrder = async (orderData) => {
  try {
    const options = {
      amount: Math.round(orderData.amount * 100), // Ensure amount is integer
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes,
      payment_capture:
        orderData.payment_capture !== undefined ? orderData.payment_capture : 1,
    }

    // Validate amount
    if (options.amount < 100) {
      // Minimum 1 INR
      throw new Error('Amount must be at least 1 INR')
    }

    const order = await razorpay.orders.create(options)
    return order
  } catch (error) {
    console.error('Razorpay order creation error:', error)
    throw new Error(`Razorpay order creation failed: ${error.message}`)
  }
}

// Verify webhook signature
export const verifyWebhookSignature = (body, signature) => {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex')

  return expectedSignature === signature
}
