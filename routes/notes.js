import express from 'express'
import {
  createNote,
  getNotes,
  getNote,
  downloadNote,
  createNoteReview,
  deleteNoteReview,
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
router.route('/:id/reviews')
  .post(authenticate, createNoteReview)
  .delete(authenticate, deleteNoteReview)

export default router
