import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      maxlength: 200,
    },
    // YouTube video URL (public or unlisted)
    courseUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String, // ImageKit URL
      required: true,
    },
    promoVideo: {
      type: String, // YouTube URL for preview
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    subscriptionType: {
      type: String,
      enum: ['free', 'paid'],
      required: true,
    },
    duration: {
      type: String, // e.g., "10 hours"
      required: true,
    },
    totalDurationMinutes: {
      type: Number, // Total minutes for progress tracking
      default: 0,
    },
    instructor: {
      type: String,
      required: true,
    },
    instructorInfo: {
      bio: String,
      specialization: [String],
      experience: Number,
      image: String, // ImageKit URL
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    studentsEnrolled: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: String,
    tags: [String],
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    modules: [
      {
        moduleNumber: Number,
        title: String,
        description: String,
        // YouTube video URL for this module
        videoUrl: {
          type: String,
          required: true,
        },
        duration: Number, // in minutes
        isFreePreview: {
          type: Boolean,
          default: false,
        },
        resources: [
          {
            name: String,
            fileUrl: String, // ImageKit URL for PDFs, etc.
            type: String, // 'pdf', 'doc', 'ppt'
          },
        ],
        quiz: {
          questions: [
            {
              question: String,
              options: [String],
              correctAnswer: Number,
              explanation: String,
            },
          ],
        },
      },
    ],
    learningOutcomes: [String],
    prerequisites: [String],
    // Course status management
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Sales and promotion
    discount: {
      percentage: Number,
      validUntil: Date,
    },
    // Completion certificate
    providesCertificate: {
      type: Boolean,
      default: false,
    },
    certificateTemplate: String, // ImageKit URL for certificate template
    // YouTube specific
    youtubeMetadata: {
      videoId: String,
      isUnlisted: {
        type: Boolean,
        default: false,
      },
      duration: String,
      uploadDate: Date,
    },
  },
  {
    timestamps: true,
  }
)

const Course = mongoose.model('Course', courseSchema)
export default Course
