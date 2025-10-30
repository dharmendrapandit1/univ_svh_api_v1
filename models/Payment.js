import mongoose from 'mongoose'

const refundSchema = new mongoose.Schema(
  {
    razorpayRefundId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number, // Stored in RUPEES
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['processed', 'pending', 'failed'],
      default: 'processed',
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
)

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number, // Stored in RUPEES
      required: true,
      min: 1, // Minimum 1 INR
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
      uppercase: true,
    },
    status: {
      type: String,
      enum: [
        'created',
        'attempted',
        'paid',
        'failed',
        'refunded',
        'partially_refunded',
      ],
      default: 'created',
      index: true,
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['course', 'note', 'notes', 'counseling', 'subscription'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        price: {
          type: Number, // Stored in RUPEES
          required: true,
          min: 0,
        },
        _id: false,
      },
    ],
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'card', 'netbanking', 'upi', 'wallet', 'emi'],
      index: true,
    },
    paymentMethodDetails: {
      bank: String,
      wallet: String,
      card: {
        network: String,
        type: String,
        last4: String,
      },
      vpa: String,
    },
    receipt: {
      type: String,
      index: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    refunds: [refundSchema],
    refundedAmount: {
      type: Number, // Stored in RUPEES
      default: 0,
      min: 0,
      validate: {
        validator: function (value) {
          return value <= this.amount
        },
        message: 'Refunded amount cannot exceed original amount',
      },
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    errorCode: String,
    errorDescription: String,
    webhookReceived: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
)

// Indexes
paymentSchema.index({ createdAt: -1 })
paymentSchema.index({ user: 1, status: 1 })
paymentSchema.index({ updatedAt: -1 })
paymentSchema.index({ 'items.itemType': 1, 'items.itemId': 1 })

// Virtuals - All amounts are already in rupees
paymentSchema.virtual('isSuccessful').get(function () {
  return this.status === 'paid'
})

paymentSchema.virtual('isRefunded').get(function () {
  return this.status === 'refunded' || this.status === 'partially_refunded'
})

// Static methods
paymentSchema.statics.findByUser = function (userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('order')
}

paymentSchema.statics.findByRazorpayOrderId = function (razorpayOrderId) {
  return this.findOne({ razorpayOrderId }).populate('user').populate('order')
}

// Instance methods
paymentSchema.methods.markAsPaid = function (paymentData = {}) {
  this.status = 'paid'
  this.razorpayPaymentId =
    paymentData.razorpayPaymentId || this.razorpayPaymentId
  this.paymentMethod = paymentData.method || this.paymentMethod
  this.paidAt = new Date()
  this.verified = true

  if (paymentData.method) {
    this.paymentMethodDetails = {
      bank: paymentData.bank,
      wallet: paymentData.wallet,
      card: paymentData.card
        ? {
            network: paymentData.card.network,
            type: paymentData.card.type,
            last4: paymentData.card.last4,
          }
        : undefined,
      vpa: paymentData.vpa,
    }
  }

  return this.save()
}

paymentSchema.methods.processRefund = async function (refundData) {
  if (this.status === 'refunded') {
    throw new Error('Payment is already fully refunded')
  }

  const refundAmount = refundData.amount || this.amount
  const remainingAmount = this.amount - this.refundedAmount

  if (refundAmount > remainingAmount) {
    throw new Error(
      `Refund amount (${refundAmount}) exceeds remaining amount (${remainingAmount})`
    )
  }

  this.refunds.push({
    razorpayRefundId: refundData.razorpayRefundId,
    amount: refundAmount,
    reason: refundData.reason,
    notes: refundData.notes,
    status: 'processed',
  })

  this.refundedAmount += refundAmount

  if (this.refundedAmount === this.amount) {
    this.status = 'refunded'
  } else {
    this.status = 'partially_refunded'
  }

  return this.save()
}

// Pre-save hooks
paymentSchema.pre('save', function (next) {
  if (this.isModified('refundedAmount')) {
    if (this.refundedAmount === this.amount) {
      this.status = 'refunded'
    } else if (this.refundedAmount > 0) {
      this.status = 'partially_refunded'
    }
  }

  if (this.isModified('status')) {
    if (this.status === 'paid' && !this.paidAt) {
      this.paidAt = new Date()
    } else if (this.status === 'failed' && !this.failedAt) {
      this.failedAt = new Date()
    }
  }

  next()
})

// JSON transform
paymentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v
    delete ret.razorpaySignature
    return ret
  },
})

const Payment = mongoose.model('Payment', paymentSchema)
export default Payment
