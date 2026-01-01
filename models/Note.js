import mongoose from 'mongoose'

const notesSchema = new mongoose.Schema(
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
    content: {
      type: String,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
    },
    previewImages: [String],
    price: {
      type: Number, // Stored in RUPEES
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number, // Stored in RUPEES
      min: 0,
      validate: {
        validator: function (value) {
          return !value || value <= this.price
        },
        message: 'Discounted price cannot be higher than original price',
      },
    },
    category: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    gradeLevel: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    pages: {
      type: Number,
      default: 1,
    },
    fileSize: {
      type: String,
    },
    fileType: {
      type: String,
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
    downloads: {
      type: Number,
      default: 0,
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    previewPages: [String],
    relatedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    imageKitFileId: {
      type: String,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          required: true,
        },
        createdAt: {
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

// Indexes
notesSchema.index({ category: 1, subject: 1 })
notesSchema.index({ gradeLevel: 1, isActive: 1 })
notesSchema.index({ price: 1, discountedPrice: 1 })
notesSchema.index({ isFeatured: 1, createdAt: -1 })
notesSchema.index({ author: 1 })
notesSchema.index({ tags: 1 })

// Virtual for discount percentage
notesSchema.virtual('discountPercentage').get(function () {
  if (this.discountedPrice && this.price && this.discountedPrice < this.price) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100)
  }
  return 0
})

// Virtual for effective price
notesSchema.virtual('effectivePrice').get(function () {
  return this.discountedPrice || this.price
})

// Instance method to increment downloads
notesSchema.methods.incrementDownload = function () {
  this.downloads += 1
  return this.save()
}

const Note = mongoose.model('Note', notesSchema)
export default Note
