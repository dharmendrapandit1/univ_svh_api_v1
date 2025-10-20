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
          enum: ['course', 'note', 'counseling'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        name: String,
        price: Number,
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
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

// Pre-save hook to generate unique orderId
orderSchema.pre('save', function (next) {
  if (!this.orderId) {
    this.orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }
  next()
})

const Order = mongoose.model('Order', orderSchema)
export default Order
