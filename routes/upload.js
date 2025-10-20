import express from 'express'
import { uploadMiddleware, handleFileUpload } from '../middleware/upload.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

router.post(
  '/',
  authenticate,
  authorize('admin'),
  uploadMiddleware,
  handleFileUpload,
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        })
      }

      res.status(200).json({
        success: true,
        data: req.file,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }
)

export default router
