import express from 'express'
import {
  createNote,
  getNotes,
  getNote,
  downloadNote,
} from '../controllers/notesController.js'
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js'
import { uploadMiddleware, handleFileUpload } from '../middleware/upload.js' // Add this import

const router = express.Router()

router.route('/').get(optionalAuth, getNotes).post(
  authenticate,
  authorize('admin'),
  uploadMiddleware, // Add multer middleware
  handleFileUpload, // Add ImageKit upload middleware
  createNote
)

router.route('/:id').get(optionalAuth, getNote)
router.route('/:id/download').get(authenticate, downloadNote)

export default router
