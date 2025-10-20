const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body) // Validate request body
    next()
  } catch (error) {
    // Check if it's a Zod error
    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      })
    }

    // Fallback for unexpected errors
    return res.status(500).json({
      success: false,
      message: 'Server error during validation',
      error: error.message,
    })
  }
}

export const validateOrderItems = (req, res, next) => {
  const { items, currency = 'INR' } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Items array is required and cannot be empty',
    })
  }

  // Validate each item
  for (const [index, item] of items.entries()) {
    if (!item.itemId) {
      return res.status(400).json({
        success: false,
        message: `Item at position ${index} is missing itemId`,
      })
    }

    if (!item.itemType) {
      return res.status(400).json({
        success: false,
        message: `Item at position ${index} is missing itemType`,
      })
    }

    if (!['course', 'notes', 'counseling'].includes(item.itemType)) {
      return res.status(400).json({
        success: false,
        message: `Item at position ${index} has invalid itemType. Must be one of: course, notes, counseling`,
      })
    }

    if (
      item.quantity &&
      (item.quantity < 1 || !Number.isInteger(item.quantity))
    ) {
      return res.status(400).json({
        success: false,
        message: `Item at position ${index} has invalid quantity. Must be a positive integer`,
      })
    }
  }

  // Validate currency
  const supportedCurrencies = ['INR', 'USD', 'EUR']
  if (!supportedCurrencies.includes(currency.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: `Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(
        ', '
      )}`,
    })
  }

  next()
}

export const validatePaymentVerification = (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body

  const missingFields = []
  if (!razorpay_order_id) missingFields.push('razorpay_order_id')
  if (!razorpay_payment_id) missingFields.push('razorpay_payment_id')
  if (!razorpay_signature) missingFields.push('razorpay_signature')
  if (!orderId) missingFields.push('orderId')

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`,
    })
  }

  next()
}

export default validate
