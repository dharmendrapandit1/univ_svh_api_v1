// models/User.js
import mongoose from 'mongoose'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto' // Added crypto

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return (
          this.subscriptionType === 'paid' ||
          this.role === 'admin' ||
          this.role === 'counselor'
        )
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Required for paid users AND admins/counselors
        return (
          this.subscriptionType === 'paid' ||
          this.role === 'admin' ||
          this.role === 'counselor'
        )
      },
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'counselor'],
      default: 'user',
    },
    subscriptionType: {
      type: String,
      enum: ['free', 'paid'],
      default: 'free',
    },
    subscriptionExpiry: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    guestId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profile: {
      phone: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
      dateOfBirth: Date,
      avatar: String,
      bio: String,
    },
    // Counselor-specific fields
    counselorProfile: {
      expertise: [String],
      isVerified: {
        type: Boolean,
        default: false,
      },
      availability: [String],
      qualifications: String,
      experience: Number, // years of experience
    },
    // Educational background
    education: {
      currentGrade: String,
      school: String,
      targetExams: [String],
      careerGoals: String,
    },
    // Enrollment and purchases
    enrolledCourses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        progress: {
          type: Number,
          default: 0,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        lastAccessed: Date,
        completedModules: [
          {
            moduleId: mongoose.Schema.Types.ObjectId,
            completedAt: Date,
            quizScore: Number,
          },
        ],
      },
    ],
    purchasedNotes: [
      {
        note: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Note',
        },
        purchasedAt: {
          type: Date,
          default: Date.now,
        },
        downloadCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    counselingSessions: [
      {
        session: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Counseling',
        },
        bookedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Razorpay customer ID
    razorpayCustomerId: {
      type: String,
    },
    // Wishlist
    wishlist: {
      courses: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
        },
      ],
      notes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Note',
        },
      ],
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
)

// JWT Token method
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  )
}

// Fix password hashing - hash for all users with passwords
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  // Hash password for all users who have passwords (paid, admin, counselor)
  if (this.password) {
    this.password = await hash(this.password, 12)
  }
  next()
})

userSchema.methods.correctPassword = async function (candidatePassword) {
  if (this.subscriptionType === 'free' && !this.password) {
    return false
  }

  if (this.password) {
    return await compare(candidatePassword, this.password)
  }

  return false
}

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000

  return resetToken
}

// Guest ID generation
userSchema.statics.generateGuestId = function () {
  return (
    'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  )
}

const User = mongoose.model('User', userSchema)
export default User
