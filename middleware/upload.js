import multer from 'multer'
import { uploadToImageKit } from '../config/imagekit.js'

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true)
    } else {
      cb(
        new Error(
          'Invalid file type. Only images, PDFs, and Word documents are allowed.'
        )
      )
    }
  },
})

export const uploadMiddleware = upload.single('file')

export const handleFileUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return next()
    }

    // Generate unique file name
    const timestamp = Date.now()
    const originalName = req.file.originalname
    const fileExtension = originalName.split('.').pop()
    const fileName = `file_${timestamp}.${fileExtension}`

    // Determine folder based on file type
    let folder = 'documents'
    if (req.file.mimetype.startsWith('image/')) {
      folder = 'images'
    }

    // Upload to ImageKit
    const uploadResult = await uploadToImageKit(req.file, fileName, folder)

    // Attach file info to request
    req.file = {
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      name: fileName,
      size: req.file.size,
      type: req.file.mimetype,
    }

    next()
  } catch (error) {
    next(error)
  }
}
