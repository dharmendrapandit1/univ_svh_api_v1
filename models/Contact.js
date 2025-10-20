import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      enum: [
        'course-inquiry',
        'study-material',
        'technical-support',
        'career-guidance',
        'partnership',
        'other',
      ],
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved'],
      default: 'new',
    },
    ipAddress: String,
    userAgent: String,
    notes: String, // For internal use
  },
  {
    timestamps: true,
  }
)

// Index for better query performance
contactSchema.index({ email: 1, createdAt: -1 })
contactSchema.index({ status: 1 })

const Contact = mongoose.model('Contact', contactSchema)

export default Contact
