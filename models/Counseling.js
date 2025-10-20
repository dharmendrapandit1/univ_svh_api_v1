import mongoose from 'mongoose'

const counselingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    interests: [String],
    preferredColleges: [String],
    budget: {
      type: String,
    },
    preferredCountries: [String],
    intendedMajor: String,
    // Counseling session details
    sessionType: {
      type: String,
      enum: ['career', 'college', 'subject', 'general'],
      default: 'general',
    },
    preferredDate: Date,
    preferredTime: String,
    duration: {
      type: Number,
      default: 60, // minutes
    },
    questions: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'scheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
    // Counselor assignment
    assignedCounselor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Session details
    scheduledAt: Date,
    meetingLink: String, // Google Meet, Zoom, etc.
    notes: String,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
    },
    // Payment information
    fee: {
      type: Number,
      default: 0,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    // Documents (ImageKit URLs)
    documents: [
      {
        name: String,
        fileUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

const Counseling = mongoose.model('Counseling', counselingSchema)
export default Counseling
