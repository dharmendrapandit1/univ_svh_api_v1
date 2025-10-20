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
