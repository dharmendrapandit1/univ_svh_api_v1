import User from '../models/User.js'
import Course from '../models/Course.js'
import Note from '../models/Note.js'

// @desc    Get public statistics
// @route   GET /api/stats/public
// @access  Public
export const getPublicStats = async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' })
    const counselorCount = await User.countDocuments({
      role: { $in: ['admin', 'counselor'] },
    })
    const courseCount = await Course.countDocuments({ isActive: true })

    // Calculate average rating from courses and notes
    const courses = await Course.find({ isActive: true }).select('rating')
    const notes = await Note.find({ isActive: true }).select('rating')
    
    let totalRating = 0
    let count = 0

    courses.forEach(c => {
        if(c.rating) {
            totalRating += c.rating
            count++
        }
    })
    
    notes.forEach(n => {
        if(n.rating) {
             totalRating += n.rating
             count++
        }
    })

    const avgRating = count > 0 ? (totalRating / count).toFixed(1) : '4.8'

    res.status(200).json({
      success: true,
      data: {
        studentCount: studentCount > 50 ? `${studentCount}+` : studentCount,
        counselorCount: counselorCount > 5 ? `${counselorCount}+` : counselorCount,
        courseCount: courseCount > 10 ? `${courseCount}+` : courseCount,
        avgRating,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
