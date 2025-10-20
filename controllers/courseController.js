import Course from '../models/Course.js'
import User from '../models/User.js'

export const createCourse = async (req, res) => {
  try {
    const courseData = req.body

    // Add createdBy field from authenticated user
    courseData.createdBy = req.user._id

    // Validate required fields
    const requiredFields = [
      'title',
      'description',
      'courseUrl',
      'thumbnailUrl',
      'instructor',
      'category',
    ]
    const missingFields = requiredFields.filter((field) => !courseData[field])

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    // Set default values for optional fields
    if (!courseData.price) courseData.price = 0
    if (!courseData.subscriptionType) courseData.subscriptionType = 'paid'
    if (!courseData.level) courseData.level = 'beginner'
    if (!courseData.duration) courseData.duration = '0 hours'

    // Calculate total duration
    if (courseData.modules && courseData.modules.length > 0) {
      courseData.totalDurationMinutes = courseData.modules.reduce(
        (total, module) => total + (module.duration || 0),
        0
      )

      // Set duration string if not provided
      if (!courseData.duration || courseData.duration === '0 hours') {
        const totalHours = Math.floor(courseData.totalDurationMinutes / 60)
        const totalMinutes = courseData.totalDurationMinutes % 60
        courseData.duration = `${totalHours}h ${totalMinutes}m`
      }
    }

    const course = new Course(courseData)
    await course.save()

    res.status(201).json({
      success: true,
      data: course,
    })
  } catch (error) {
    console.error('Course creation error:', error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
export const getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      subscriptionType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    const filter = { isActive: true }

    if (category) filter.category = category
    if (level) filter.level = level
    if (subscriptionType) filter.subscriptionType = subscriptionType
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ]
    }

    const courses = await Course.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviews.user', 'name')

    const total = await Course.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      'reviews.user',
      'name avatar'
    )

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      })
    }

    // Check if user is enrolled (for paid courses)
    let isEnrolled = false
    let userProgress = null

    if (req.user && req.user.role !== 'guest') {
      const user = await User.findById(req.user._id)
      const enrollment = user.enrolledCourses.find(
        (enrolled) => enrolled.course.toString() === req.params.id
      )

      if (enrollment) {
        isEnrolled = true
        userProgress = enrollment
      }
    }

    // Increment views
    course.views += 1
    await course.save()

    res.status(200).json({
      success: true,
      data: {
        ...course.toObject(),
        isEnrolled,
        userProgress,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const updateCourseProgress = async (req, res) => {
  try {
    const { courseId, moduleId, completed, quizScore } = req.body
    const userId = req.user._id

    const user = await User.findById(userId)
    const enrollment = user.enrolledCourses.find(
      (enrolled) => enrolled.course.toString() === courseId
    )

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course',
      })
    }

    if (completed) {
      // Check if module already completed
      const existingModule = enrollment.completedModules.find(
        (module) => module.moduleId.toString() === moduleId
      )

      if (existingModule) {
        existingModule.completedAt = new Date()
        if (quizScore !== undefined) existingModule.quizScore = quizScore
      } else {
        enrollment.completedModules.push({
          moduleId,
          completedAt: new Date(),
          quizScore,
        })
      }

      // Update overall progress
      const course = await Course.findById(courseId)
      const totalModules = course.modules.length
      const completedModules = enrollment.completedModules.length
      enrollment.progress = Math.round((completedModules / totalModules) * 100)

      // Check if course completed
      if (completedModules === totalModules) {
        enrollment.completed = true
        enrollment.progress = 100
      }

      await user.save()

      res.status(200).json({
        success: true,
        progress: enrollment.progress,
        completedModules: enrollment.completedModules.length,
      })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
