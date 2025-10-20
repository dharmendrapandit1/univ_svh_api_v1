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
    // ImageKit file URL
    fileUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String, // ImageKit URL
    },
    previewImages: [String], // ImageKit URLs for sample pages
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
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
      type: String, // e.g., "2.5 MB"
    },
    fileType: {
      type: String, // pdf, doc, etc.
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
    previewPages: [String], // URLs of sample pages
    relatedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    // ImageKit metadata
    imageKitFileId: {
      type: String, // Store ImageKit file ID for future operations
    },
  },
  {
    timestamps: true,
  }
)

const Note = mongoose.model('Note', notesSchema)
export default Note
