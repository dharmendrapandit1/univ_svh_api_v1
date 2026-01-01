import mongoose from 'mongoose'

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'yes-no', 'input', 'poll'],
    default: 'multiple-choice',
  },
  options: [
    {
      type: String,
      // Not required for 'input' type
    },
  ],
  correctAnswer: {
    type: Number, // Index of the correct option (0-3) for choice-based
    // Not required for 'poll' or 'input'
  },
  textAnswer: {
    type: String, // Correct answer for 'input' type
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  category: {
    type: String,
    default: 'General',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const quizResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

export const QuizQuestion = mongoose.model('QuizQuestion', quizQuestionSchema)
export const QuizResult = mongoose.model('QuizResult', quizResultSchema)
