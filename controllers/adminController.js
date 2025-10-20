import User from '../models/User.js'
import Course from '../models/Course.js'
import Note from '../models/Note.js'
import Counseling from '../models/Counseling.js'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import Contact from '../models/Contact.js'

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCourses,
      totalNotes,
      totalCounselingSessions,
      totalRevenue,
      recentOrders,
      popularCourses,
      pendingCounseling,
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Note.countDocuments(),
      Counseling.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email'),
      Course.find().sort({ studentsEnrolled: -1 }).limit(5),
      Counseling.countDocuments({ status: 'pending' }),
    ])

    // Monthly revenue data for current year
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'paid',
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
            $lte: new Date(),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Weekly stats
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [weeklyUsers, weeklyRevenue, weeklyOrders] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Payment.aggregate([
        {
          $match: {
            status: 'paid',
            createdAt: { $gte: oneWeekAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
    ])

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalNotes,
          totalCounselingSessions,
          pendingCounseling,
          totalRevenue: totalRevenue[0]?.total || 0,
          weeklyUsers,
          weeklyRevenue: weeklyRevenue[0]?.total || 0,
          weeklyOrders,
        },
        recentOrders,
        popularCourses,
        monthlyRevenue,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
    })
  }
}

export const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      subscriptionType,
      search,
      isActive,
    } = req.query

    const filter = {}
    if (role) filter.role = role
    if (subscriptionType) filter.subscriptionType = subscriptionType
    if (isActive !== undefined) filter.isActive = isActive === 'true'
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: users,
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

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const updateUser = async (req, res) => {
  try {
    const {
      role,
      subscriptionType,
      subscriptionExpiry,
      isActive,
      name,
      email,
    } = req.body

    const updateData = {}
    if (role !== undefined) updateData.role = role
    if (subscriptionType !== undefined)
      updateData.subscriptionType = subscriptionType
    if (subscriptionExpiry !== undefined)
      updateData.subscriptionExpiry = subscriptionExpiry
    if (isActive !== undefined) updateData.isActive = isActive
    if (name) updateData.name = name
    if (email) updateData.email = email

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      })
    }
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getAdminCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, search } = req.query

    const filter = {}
    if (status) filter.status = status
    if (category) filter.category = category
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('instructor', 'name email')

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

export const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user.id, // Set the current admin as instructor
    }

    const course = await Course.create(courseData)

    res.status(201).json({
      success: true,
      data: course,
      message: 'Course created successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      })
    }

    res.status(200).json({
      success: true,
      data: course,
      message: 'Course updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('views', 'number')
      .populate('category') // Optional: populate category if needed
      .populate('instructor', 'name') // Optional: populate students if needed

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      })
    }

    res.status(200).json({
      success: true,
      data: course,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id)

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const bulkActionCourses = async (req, res) => {
  try {
    const { action, courseIds } = req.body

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No courses selected',
      })
    }

    let update
    switch (action) {
      case 'activate':
        update = { isActive: true }
        break
      case 'deactivate':
        update = { isActive: false }
        break
      case 'feature':
        update = { isFeatured: true }
        break
      case 'unfeature':
        update = { isFeatured: false }
        break
      case 'publish':
        update = { status: 'published' }
        break
      case 'unpublish':
        update = { status: 'draft' }
        break
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        })
    }

    const result = await Course.updateMany({ _id: { $in: courseIds } }, update)

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} courses updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      search,
    } = req.query

    const filter = {}
    if (status) filter.status = status

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
      ]
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.itemId', 'title name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Order.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: orders,
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

export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email')

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      })
    }

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Add other controller methods for counseling, notes, etc.
export const getCounselingSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query

    const filter = {}
    if (status) filter.status = status
    if (search) {
      filter.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
      ]
    }

    const sessions = await Counseling.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Counseling.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: sessions,
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

export const updateCounselingSession = async (req, res) => {
  try {
    const session = await Counseling.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email')

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Counseling session not found',
      })
    }

    res.status(200).json({
      success: true,
      data: session,
      message: 'Counseling session updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getAdminNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query

    const filter = {}
    if (category) filter.category = category
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Note.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: notes,
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

export const createNote = async (req, res) => {
  try {
    const note = await Note.create(req.body)

    res.status(201).json({
      success: true,
      data: note,
      message: 'Note created successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const updateNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      })
    }

    res.status(200).json({
      success: true,
      data: note,
      message: 'Note updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      })
    }

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getContactMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const filter = {}
    if (status) filter.status = status

    const messages = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Contact.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: messages,
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
