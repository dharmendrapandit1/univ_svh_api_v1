import dotenv from 'dotenv'
dotenv.config()
import Razorpay from 'razorpay'

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    'Razorpay environment variables are missing. Please check your .env file'
  )
}

// Webhook secret validation
if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
  console.warn(
    '⚠️ RAZORPAY_WEBHOOK_SECRET not set - webhook verification disabled'
  )
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export const createRazorpayOrder = async (orderData) => {
  try {
    // Currency validation
    const validCurrencies = ['INR', 'USD', 'EUR']
    const currency = (orderData.currency || 'INR').toUpperCase()

    if (!validCurrencies.includes(currency)) {
      throw new Error(
        `Unsupported currency: ${currency}. Supported: ${validCurrencies.join(
          ', '
        )}`
      )
    }

    const options = {
      amount: Math.round(orderData.amount * 100), // Convert rupees to paise for Razorpay
      currency: currency,
      receipt: orderData.receipt,
      notes: orderData.notes,
      payment_capture:
        orderData.payment_capture !== undefined ? orderData.payment_capture : 1,
    }

    // Validate amount (minimum 1 INR = 100 paise)
    if (options.amount < 100) {
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
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('Webhook verification skipped - no secret configured')
    return true
  }

  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex')

  return expectedSignature === signature
}

// Check payment status from Razorpay
export const checkPaymentStatus = async (razorpayOrderId) => {
  try {
    const order = await razorpay.orders.fetch(razorpayOrderId)
    return order.status
  } catch (error) {
    console.error('Error fetching payment status:', error)
    return 'unknown'
  }
}
