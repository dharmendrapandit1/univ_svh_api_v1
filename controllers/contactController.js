import Contact from '../models/Contact.js'

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      })
    }

    // Save contact form to database
    const contact = new Contact({
      name,
      email,
      subject,
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    })

    await contact.save()

    res.status(200).json({
      success: true,
      message:
        'Thank you for your message! We will get back to you within 24 hours.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt,
      },
    })
  } catch (error) {
    console.error('Contact form error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit contact form. Please try again later.',
    })
  }
}

// @desc    Get all messages (Admin)
// @route   GET /api/contact
// @access  Private/Admin
export const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 })
    res.status(200).json({
      success: true,
      data: messages,
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    })
  }
}

// @desc    Update message status
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    const message = await Contact.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      })
    }

    message.status = status
    await message.save()

    res.status(200).json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error('Update status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
    })
  }
}

// @desc    Delete message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
export const deleteMessage = async (req, res) => {
  try {
    const message = await Contact.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      })
    }

    await message.deleteOne()

    res.status(200).json({
      success: true,
      message: 'Message removed',
    })
  } catch (error) {
    console.error('Delete message error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
    })
  }
}

// @desc    Add internal note
// @route   PUT /api/contact/:id/note
// @access  Private/Admin
export const addNote = async (req, res) => {
  try {
    const { note } = req.body
    const message = await Contact.findById(req.params.id)

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      })
    }

    message.notes = note
    await message.save()

    res.status(200).json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error('Add note error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
    })
  }
}
