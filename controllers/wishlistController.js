import User from '../models/User.js'

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('wishlist.courses')
      .populate('wishlist.notes')

    res.status(200).json({
      success: true,
      data: user.wishlist,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const addToWishlist = async (req, res) => {
  try {
    const { itemType, itemId } = req.body
    const userId = req.user._id

    if (!['course', 'notes'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type',
      })
    }

    const user = await User.findById(userId)
    const wishlistArray = user.wishlist[`${itemType}s`]

    // Check if already in wishlist
    const alreadyInWishlist = wishlistArray.some(
      (item) => item.toString() === itemId
    )

    if (alreadyInWishlist) {
      return res.status(400).json({
        success: false,
        message: `${itemType} already in wishlist`,
      })
    }

    wishlistArray.push(itemId)
    await user.save()

    res.status(200).json({
      success: true,
      message: `${itemType} added to wishlist`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const removeFromWishlist = async (req, res) => {
  try {
    const { itemType, itemId } = req.body
    const userId = req.user._id

    if (!['course', 'notes'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type',
      })
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { [`wishlist.${itemType}s`]: itemId },
    })

    res.status(200).json({
      success: true,
      message: `${itemType} removed from wishlist`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
