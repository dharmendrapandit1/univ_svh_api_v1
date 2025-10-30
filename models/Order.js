import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    items: [
      {
        itemType: {
          type: String,
          enum: ['course', 'note', 'notes', 'counseling'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        name: String,
        price: Number, // Stored in RUPEES
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    totalAmount: {
      type: Number, // Stored in RUPEES
      required: true,
    },
    discount: {
      type: Number, // Stored in RUPEES
      default: 0,
    },
    finalAmount: {
      type: Number, // Stored in RUPEES
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'processing', 'delivered'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
orderSchema.index({ user: 1, status: 1 })
orderSchema.index({ createdAt: -1 })
orderSchema.index({ orderId: 1 })

// Pre-save hook to generate unique orderId
orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }
  next()
})

// Virtual for order summary
orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0)
})

const Order = mongoose.model('Order', orderSchema)
export default Order
