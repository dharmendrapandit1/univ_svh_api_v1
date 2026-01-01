import express from 'express'
import { 
    getQuestions, 
    submitQuiz, 
    checkAnswer,
    createQuestion, 
    getAllQuestions, 
    deleteQuestion 
} from '../controllers/quizController.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = express.Router()

// User routes (Authenticated)
router.use(authenticate)

router.get('/', getQuestions)
router.post('/submit', submitQuiz)
router.post('/check', checkAnswer)

// Admin routes (Authorized)
// Creating separate router logic or chaining could work, but using inline middleware is clearer for specifics
router.post('/', authorize('admin'), createQuestion)
router.get('/all', authorize('admin'), getAllQuestions)
router.delete('/:id', authorize('admin'), deleteQuestion)

export default router
