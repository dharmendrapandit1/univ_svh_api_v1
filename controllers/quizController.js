import { QuizQuestion, QuizResult } from '../models/Quiz.js'

// Get Random Questions for User
export const getQuestions = async (req, res) => {
  try {
    const count = await QuizQuestion.countDocuments()
    
    // Seed if empty logic removed as per user request


    // Get 10 random questions
    // Note: If you want to support all types, ensure client can handle them.
    // For now we return mixed types.
    const questions = await QuizQuestion.aggregate([{ $sample: { size: 10 } }])

    // Hide correct answer/textAnswer from client
    const sanitizedQuestions = questions.map((q) => {
        const sanitized = {
            _id: q._id,
            type: q.type || 'multiple-choice',
            question: q.question,
            options: q.options,
            category: q.category,
            difficulty: q.difficulty,
        }
        // Remove undefined fields to keep payload clean
        return sanitized
    })

    res.status(200).json({
      success: true,
      data: sanitizedQuestions,
    })
  } catch (error) {
    console.error('Get Questions Error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
    })
  }
}

// Submit Quiz
export const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body // Array of { questionId, selectedOptionIndex, textAnswer }
    const userId = req.user._id

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answers format',
      })
    }

    let score = 0
    let totalQuestions = answers.length
    
    // Fetch all questions involved
    const questionIds = answers.map(a => a.questionId)
    const questions = await QuizQuestion.find({ _id: { $in: questionIds } })

    const questionMap = {}
    questions.forEach(q => {
        questionMap[q._id.toString()] = q
    })

    answers.forEach(ans => {
        const question = questionMap[ans.questionId]
        if (!question) return

        if (question.type === 'input') {
            // Case-insensitive comparison for text answers
            if (ans.textAnswer && question.textAnswer && 
                ans.textAnswer.trim().toLowerCase() === question.textAnswer.trim().toLowerCase()) {
                score++
            }
        } else if (question.type === 'poll') {
            // Polls don't have right/wrong answers, usually give points for participation
            score++ 
        } else {
            // Multiple choice, T/F, Yes/No use index
            if (question.correctAnswer === ans.selectedOptionIndex) {
                score++
            }
        }
    })

    const percentage = (score / totalQuestions) * 100

    // Save result
    const quizResult = await QuizResult.create({
      user: userId,
      submitQuiz, 
    checkAnswer,
    createQuestion, s,
      percentage,
    })

    // Calculate percentile
    const totalResults = await QuizResult.countDocuments()
    const beatenResults = await QuizResult.countDocuments({ percentage: { $lt: percentage } })
    
    let percentile = 0
    if (totalResults > 1) {
        percentile = (beatenResults / totalResults) * 100
    } else {
        if (percentage >= 80) percentile = 92
        else if (percentage >= 50) percentile = 65
        else percentile = 20
    }
    
    // Percentile boosting logic
    if (percentage === 100) percentile = Math.max(percentile, 99)
    else if (percentage >= 90) percentile = Math.max(percentile, 95)
    else if (percentage >= 80) percentile = Math.max(percentile, 90)

    res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      result: {
        score,
        totalQuestions,
        percentage,
        percentile: Math.round(percentile),
      },
    })
  } catch (error) {
    console.error('Submit Quiz Error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message,
    })
  }
}

// Check Single Answer (Gamified Mode)
export const checkAnswer = async (req, res) => {
  try {
    const { questionId, selectedOption, textAnswer } = req.body
    
    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Question ID required' })
    }

    const question = await QuizQuestion.findById(questionId)
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' })
    }

    let isCorrect = false
    let correctAnswerDisplay = ''

    if (question.type === 'input') {
      if (textAnswer && question.textAnswer && 
          textAnswer.trim().toLowerCase() === question.textAnswer.trim().toLowerCase()) {
          isCorrect = true
      }
      correctAnswerDisplay = question.textAnswer
    } else if (question.type === 'poll') {
      isCorrect = true // Polls are always "correct" for participation
      correctAnswerDisplay = 'Poll recorded'
    } else {
      // Choice based
      if (question.correctAnswer === selectedOption) {
        isCorrect = true
      }
      // Return the string of the correct option for display
      correctAnswerDisplay = question.options[question.correctAnswer]
    }

    res.status(200).json({
      success: true,
      isCorrect,
      correctAnswer: correctAnswerDisplay, // Send back correct answer for feedback UI
      correctOptionIndex: question.correctAnswer // Also send index for highlighting
    })

  } catch (error) {
    console.error('Check Answer Error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to check answer',
    })
  }
}

// -------------------- ADMIN FUNCTIONS --------------------

// Create Question (Admin)
export const createQuestion = async (req, res) => {
    try {
        const { question, type, options, correctAnswer, textAnswer, difficulty, category } = req.body

        // Basic validation
        if (!question || !type) {
            return res.status(400).json({ success: false, message: 'Question and type are required' })
        }

        if ((type === 'multiple-choice' || type === 'poll') && (!options || options.length < 2)) {
             return res.status(400).json({ success: false, message: 'Options are required for this type' })
        }

        if (type === 'input' && !textAnswer) {
             return res.status(400).json({ success: false, message: 'Text answer is required for input type' })
        }
        
        // For choice based types (excluding poll), correct answer index is needed
        if (['multiple-choice', 'true-false', 'yes-no'].includes(type) && correctAnswer === undefined) {
             return res.status(400).json({ success: false, message: 'Correct answer index is required' })
        }

        const newQuestion = await QuizQuestion.create({
            question,
            type,
            options,
            correctAnswer,
            textAnswer,
            difficulty,
            category
        })

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            data: newQuestion
        })
    } catch (error) {
        console.error('Create Question Error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to create question',
            error: error.message
        })
    }
}

// Delete Question (Admin)
export const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params
        const question = await QuizQuestion.findByIdAndDelete(id)
        
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found' })
        }

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully'
        })
    } catch (error) {
        console.error('Delete Question Error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to delete question',
            error: error.message
        })
    }
}

// Get All Questions (Admin)
export const getAllQuestions = async (req, res) => {
    try {
        const questions = await QuizQuestion.find().sort({ createdAt: -1 })
        res.status(200).json({
            success: true,
            count: questions.length,
            data: questions
        })
    } catch (error) {
        console.error('Get All Questions Error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch questions',
            error: error.message
        })
    }
}
