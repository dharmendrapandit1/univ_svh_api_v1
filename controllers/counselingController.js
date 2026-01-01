import Counseling from '../models/Counseling.js'
import User from '../models/User.js'

export const createCounselingRequest = async (req, res) => {
  try {
    const counselingData = {
      ...req.body,
      user: req.user._id,
      paymentStatus: 'pending',
      fee: 249, // Ensure fee is set
    }

    const counseling = new Counseling(counselingData)
    await counseling.save()

    // Add to user's counseling sessions
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        counselingSessions: {
          session: counseling._id,
          bookedAt: new Date(),
        },
      },
    })

    res.status(201).json({
      success: true,
      data: counseling,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const getCounselingSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const filter = {}

    if (req.user.role === 'user') {
      filter.user = req.user._id
    }

    if (status) filter.status = status

    const sessions = await Counseling.find(filter)
      .populate('user', 'name email profile.phone')
      .populate('assignedCounselor', 'name email profile.specialization')
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
    const { assignedCounselor, status, scheduledAt, meetingLink, notes, fee, paymentStatus } =
      req.body

    const updateData = {}
    if (assignedCounselor) updateData.assignedCounselor = assignedCounselor
    if (status) updateData.status = status
    if (scheduledAt) updateData.scheduledAt = scheduledAt
    if (meetingLink) updateData.meetingLink = meetingLink
    if (notes) updateData.notes = notes
    if (fee !== undefined) updateData.fee = fee
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    const counseling = await Counseling.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedCounselor', 'name email')

    if (!counseling) {
      return res.status(404).json({
        success: false,
        message: 'Counseling session not found',
      })
    }

    res.status(200).json({
      success: true,
      data: counseling,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const addCounselingFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body

    const counseling = await Counseling.findById(req.params.id)

    if (!counseling) {
      return res.status(404).json({
        success: false,
        message: 'Counseling session not found',
      })
    }

    // Check if user is authorized to add feedback
    if (
      req.user.role === 'user' &&
      counseling.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add feedback for this session',
      })
    }

    counseling.feedback = { rating, comment }
    await counseling.save()

    res.status(200).json({
      success: true,
      data: counseling,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
