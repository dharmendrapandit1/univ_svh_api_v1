import Notification from '../models/Notification.js'

// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private/Admin
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, expiresInDays, link } = req.body

    let expiresAt = null
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays))
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      link,
      createdBy: req.user._id,
      expiresAt,
    })

    res.status(201).json({
      success: true,
      data: notification,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    })
  }
}

// @desc    Get all active notifications
// @route   GET /api/notifications
// @access  Public (or Protected, depending on requirement - making it Public/Auth accessible)
export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    })
  }
}

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      })
    }

    await notification.deleteOne()

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    })
  }
}
