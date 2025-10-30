import Payment from '../models/Payment.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Note from '../models/Note.js'
import Counseling from '../models/Counseling.js'
import {
  createRazorpayOrder,
  razorpay,
  verifyWebhookSignature,
} from '../config/razorpay.js'
import crypto from 'crypto'
import mongoose from 'mongoose'

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { items, currency = 'INR', notes } = req.body
    const userId = req.user._id

    // Input validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({
        success: false,
        message: 'Items array is required and cannot be empty',
      })
    }

    // Proper currency validation
    const validCurrencies = ['INR', 'USD', 'EUR']
    const validCurrency = currency.toUpperCase()

    if (!validCurrencies.includes(validCurrency)) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({
        success: false,
        message: `Unsupported currency: ${currency}. Supported: ${validCurrencies.join(
          ', '
        )}`,
      })
    }

    // Calculate total amount in RUPEES
    let totalAmount = 0
    const orderItems = []
    const paymentItems = []

    for (const item of items) {
      if (!item.itemId || !item.itemType) {
        await session.abortTransaction()
        session.endSession()
        return res.status(400).json({
          success: false,
          message: 'Each item must have itemId and itemType',
        })
      }

      let itemDetails
      let price // Will be in RUPEES
      let itemName

      switch (item.itemType) {
        case 'course':
          itemDetails = await Course.findById(item.itemId).session(session)
          if (!itemDetails) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
              success: false,
              message: `Course not found with ID: ${item.itemId}`,
            })
          }
          price = itemDetails.discountedPrice || itemDetails.price
          itemName = itemDetails.title
          break

        case 'notes':
          itemDetails = await Note.findById(item.itemId).session(session)
          if (!itemDetails) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
              success: false,
              message: `Notes not found with ID: ${item.itemId}`,
            })
          }
          price = itemDetails.discountedPrice || itemDetails.price
          itemName = itemDetails.title
          break

        case 'counseling':
          itemDetails = await Counseling.findById(item.itemId).session(session)
          if (!itemDetails) {
            await session.abortTransaction()
            session.endSession()
            return res.status(404).json({
              success: false,
              message: `Counseling session not found with ID: ${item.itemId}`,
            })
          }
          price = itemDetails.fee
          itemName = `Counseling - ${itemDetails.studentName || 'Session'}`
          break

        default:
          await session.abortTransaction()
          session.endSession()
          return res.status(400).json({
            success: false,
            message: `Invalid item type: ${item.itemType}`,
          })
      }

      // Enhanced price validation
      if (!price || price <= 0) {
        await session.abortTransaction()
        session.endSession()
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${item.itemType}`,
        })
      }

      const quantity = item.quantity || 1
      totalAmount += price * quantity

      orderItems.push({
        itemType: item.itemType,
        itemId: item.itemId,
        name: itemName,
        price: price, // RUPEES
        quantity: quantity,
      })

      paymentItems.push({
        itemType: item.itemType,
        itemId: item.itemId,
        name: itemName,
        price: price, // RUPEES
        quantity: quantity,
      })
    }

    // Validate total amount (minimum 1 INR)
    if (totalAmount < 1) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({
        success: false,
        message: 'Total amount must be at least 1 INR',
      })
    }

    // Generate orderId
    const generatedOrderId = `ORD_${Date.now()}_${Math.floor(
      Math.random() * 1000
    )}`

    // Create order in database - all amounts in RUPEES
    const order = new Order({
      user: userId,
      orderId: generatedOrderId,
      items: orderItems,
      totalAmount: totalAmount, // RUPEES
      finalAmount: totalAmount, // RUPEES
      status: 'pending',
      notes: notes,
    })

    await order.save({ session })

    // Create Razorpay order (amount converted to paise internally in createRazorpayOrder)
    const razorpayOrder = await createRazorpayOrder({
      amount: totalAmount, // Pass rupees, gets converted to paise
      currency: validCurrency,
      receipt: order.orderId,
      notes: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    })

    // Create payment record - all amounts in RUPEES
    const payment = new Payment({
      user: userId,
      order: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount, // RUPEES
      currency: validCurrency,
      items: paymentItems,
      status: 'created',
      receipt: order.orderId,
    })

    await payment.save({ session })

    // Link payment to order
    order.payment = payment._id
    await order.save({ session })

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      orderId: order._id,
      paymentId: payment._id,
      amount: totalAmount, // RUPEES (for frontend display)
      currency: validCurrency,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Create order error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create order. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      payment_method,
    } = req.body

    // Enhanced input validation
    const missingFields = []
    if (!razorpay_order_id) missingFields.push('razorpay_order_id')
    if (!razorpay_payment_id) missingFields.push('razorpay_payment_id')
    if (!razorpay_signature) missingFields.push('razorpay_signature')
    if (!orderId) missingFields.push('orderId')

    if (missingFields.length > 0) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    const isAuthentic = expectedSignature === razorpay_signature

    if (!isAuthentic) {
      // Payment failed - signature mismatch
      const payment = await Payment.findOne({
        razorpayOrderId: razorpay_order_id,
      }).session(session)

      if (payment) {
        payment.status = 'failed'
        payment.razorpayPaymentId = razorpay_payment_id
        payment.errorDescription = 'Signature verification failed'
        await payment.save({ session })

        // Also update order status
        const order = await Order.findById(orderId).session(session)
        if (order) {
          order.status = 'failed'
          await order.save({ session })
        }
      }

      await session.commitTransaction()
      session.endSession()

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature',
      })
    }

    // Payment successful - signature verified
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    }).session(session)

    const order = await Order.findById(orderId).session(session)

    if (!payment || !order) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({
        success: false,
        message: 'Payment or order not found',
      })
    }

    // Check if already processed
    if (payment.status === 'paid') {
      await session.commitTransaction()
      session.endSession()
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          paymentId: payment._id,
          orderId: order._id,
          // ✅ Include purchased items even for already processed payments
          purchasedItems: order.items.map((item) => ({
            itemId: item.itemId,
            itemType: item.itemType,
          })),
        },
      })
    }

    // Update payment status with additional details
    payment.razorpayPaymentId = razorpay_payment_id
    payment.razorpaySignature = razorpay_signature
    payment.status = 'paid'
    payment.paymentMethod = payment_method || 'razorpay'
    payment.paidAt = new Date()
    payment.verified = true
    await payment.save({ session })

    // Update order status
    order.status = 'completed'
    order.payment = payment._id
    await order.save({ session })

    // Enroll user in courses, grant access to notes, etc.
    await grantUserAccess(order.user, order.items, session)

    await session.commitTransaction()
    session.endSession()

    // Fetch updated order with populated data
    const updatedOrder = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('payment')
      .populate('items.itemId')

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        orderId: order._id,
        order: updatedOrder,
        amount: payment.amount, // RUPEES
        currency: payment.currency,
        // ✅ ADD THIS: Return purchased item IDs for immediate UI update
        purchasedItems: order.items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
        })),
      },
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()

    console.error('Payment verification error:', error)
    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please contact support.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

// Webhook handler for Razorpay
export const handleWebhook = async (req, res) => {
  // Immediately acknowledge webhook receipt
  res.status(202).json({ received: true })

  try {
    const signature = req.headers['x-razorpay-signature']

    if (!verifyWebhookSignature(req.body, signature)) {
      console.error('Invalid webhook signature')
      return
    }

    const event = req.body.event
    const payload = req.body.payload

    console.log(`Processing webhook event: ${event}`)

    switch (event) {
      case 'payment.captured':
        await handleSuccessfulPayment(payload.payment.entity)
        break
      case 'payment.failed':
        await handleFailedPayment(payload.payment.entity)
        break
      case 'payment.refunded':
        await handleRefund(payload.refund.entity)
        break
      case 'order.paid':
        await handleOrderPaid(payload.order.entity)
        break
      default:
        console.log(`Unhandled webhook event: ${event}`)
    }
  } catch (error) {
    console.error('Webhook processing error:', error)
  }
}

const handleSuccessfulPayment = async (paymentEntity) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentEntity.order_id,
    }).session(session)

    if (payment && payment.status !== 'paid') {
      payment.razorpayPaymentId = paymentEntity.id
      payment.status = 'paid'
      payment.paymentMethod = paymentEntity.method
      payment.paidAt = new Date()
      payment.webhookReceived = true

      // Store payment method details
      if (paymentEntity.method) {
        payment.paymentMethodDetails = {
          bank: paymentEntity.bank,
          wallet: paymentEntity.wallet,
          vpa: paymentEntity.vpa,
        }
      }

      await payment.save({ session })

      const order = await Order.findOne({ payment: payment._id }).session(
        session
      )
      if (order) {
        order.status = 'completed'
        await order.save({ session })
        await grantUserAccess(order.user, order.items, session)
      }

      await session.commitTransaction()
      console.log(`Webhook: Payment ${paymentEntity.id} marked as paid`)
    } else {
      await session.abortTransaction()
    }
    session.endSession()
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Error handling successful payment webhook:', error)
  }
}

const handleFailedPayment = async (paymentEntity) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const payment = await Payment.findOne({
      razorpayOrderId: paymentEntity.order_id,
    }).session(session)

    if (payment && payment.status !== 'failed') {
      payment.status = 'failed'
      payment.razorpayPaymentId = paymentEntity.id
      payment.failedAt = new Date()
      payment.errorCode = paymentEntity.error_code
      payment.errorDescription = paymentEntity.error_description
      await payment.save({ session })

      // Update order status
      const order = await Order.findOne({ payment: payment._id }).session(
        session
      )
      if (order) {
        order.status = 'failed'
        await order.save({ session })
      }

      await session.commitTransaction()
      console.log(`Webhook: Payment ${paymentEntity.id} marked as failed`)
    }
    session.endSession()
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error('Error handling failed payment webhook:', error)
  }
}

const handleRefund = async (refundEntity) => {
  try {
    const payment = await Payment.findOne({
      razorpayPaymentId: refundEntity.payment_id,
    })

    if (payment) {
      // Convert from paise to rupees for refund amount
      const refundAmountInRupees = refundEntity.amount / 100

      await payment.processRefund({
        razorpayRefundId: refundEntity.id,
        amount: refundAmountInRupees, // RUPEES
        reason: refundEntity.notes?.reason || 'Refund processed',
        notes: refundEntity.notes?.note,
      })

      console.log(
        `Webhook: Refund processed for payment ${refundEntity.payment_id}, amount: ${refundAmountInRupees} INR`
      )
    }
  } catch (error) {
    console.error('Error handling refund webhook:', error)
  }
}

const handleOrderPaid = async (orderEntity) => {
  // Handle order.paid event if needed
  console.log(`Webhook: Order paid event for ${orderEntity.id}`)
}

const grantUserAccess = async (userId, items, session = null) => {
  const user = await User.findById(userId).session(session)
  const updateOptions = session ? { session } : {}

  for (const item of items) {
    try {
      switch (item.itemType) {
        case 'course':
          const alreadyEnrolled = user.enrolledCourses.some(
            (enrolled) => enrolled.course.toString() === item.itemId.toString()
          )

          if (!alreadyEnrolled) {
            user.enrolledCourses.push({
              course: item.itemId,
              enrolledAt: new Date(),
            })

            await Course.findByIdAndUpdate(
              item.itemId,
              {
                $inc: { studentsEnrolled: 1 },
                $addToSet: { enrolledUsers: userId },
              },
              updateOptions
            )
            console.log(`User ${userId} enrolled in course ${item.itemId}`)
          }
          break

        case 'notes':
          const alreadyPurchased = user.purchasedNotes.some(
            (purchased) => purchased.note.toString() === item.itemId.toString()
          )

          if (!alreadyPurchased) {
            user.purchasedNotes.push({
              note: item.itemId,
              purchasedAt: new Date(),
            })

            await Note.findByIdAndUpdate(
              item.itemId,
              { $inc: { downloads: 1 } },
              updateOptions
            )
            console.log(`User ${userId} purchased note ${item.itemId}`)
          }
          break

        case 'counseling':
          await Counseling.findByIdAndUpdate(
            item.itemId,
            {
              paymentStatus: 'paid',
              status: 'confirmed',
              user: userId,
            },
            updateOptions
          )
          console.log(`User ${userId} confirmed counseling ${item.itemId}`)
          break
      }
    } catch (error) {
      console.error(
        `Error granting access for ${item.itemType} ${item.itemId}:`,
        error
      )
    }
  }

  await user.save(updateOptions)
  console.log(`User access granted successfully for user ${userId}`)
}

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await Order.findById(orderId)
      .populate('payment')
      .populate('user', 'name email')
      .populate('items.itemId')

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        amount: order.finalAmount, // RUPEES
        currency: order.payment?.currency || 'INR',
        // ✅ Also include purchased items in payment status response
        purchasedItems: order.items.map((item) => ({
          itemId: item.itemId,
          itemType: item.itemType,
        })),
      },
    })
  } catch (error) {
    console.error('Get payment status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

// Get user's payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    const payments = await Payment.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('order')
      .exec()

    const total = await Payment.countDocuments({ user: userId })

    res.status(200).json({
      success: true,
      data: {
        payments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    })
  } catch (error) {
    console.error('Get payment history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
    })
  }
}

// Additional utility function to check payment status from Razorpay
export const checkRazorpayPaymentStatus = async (req, res) => {
  try {
    const { razorpayOrderId } = req.params

    if (!razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order ID is required',
      })
    }

    const order = await razorpay.orders.fetch(razorpayOrderId)

    res.status(200).json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        status: order.status,
        amount: order.amount / 100, // Convert paise to rupees
        currency: order.currency,
        createdAt: new Date(order.created_at * 1000),
      },
    })
  } catch (error) {
    console.error('Check Razorpay payment status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}
