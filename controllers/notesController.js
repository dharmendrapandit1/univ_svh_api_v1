import Note from '../models/Note.js'
import User from '../models/User.js'

export const createNote = async (req, res) => {
  try {
    const noteData = req.body

    // Validate required fields
    const requiredFields = [
      'title',
      'description',
      'category',
      'subject',
      'gradeLevel',
      'author',
      'price',
    ]
    const missingFields = requiredFields.filter((field) => !noteData[field])

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    // Handle file upload if present (from multer)
    if (req.file) {
      noteData.fileUrl = req.file.url
      noteData.fileSize = req.file.size
      noteData.fileType = req.file.type
      noteData.imageKitFileId = req.file.fileId
    } else {
      // If no file from multer, use the fileUrl from request body (already uploaded via separate API)
      if (!noteData.fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'File URL is required',
        })
      }
    }

    // Set default values
    if (!noteData.pages) noteData.pages = 1
    if (!noteData.tags) noteData.tags = []
    if (!noteData.previewImages) noteData.previewImages = []
    if (!noteData.relatedCourses) noteData.relatedCourses = []

    const note = new Note(noteData)
    await note.save()

    res.status(201).json({
      success: true,
      data: note,
    })
  } catch (error) {
    console.error('Note creation error:', error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
export const getNotes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subject,
      gradeLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    const filter = { isActive: true }

    if (category) filter.category = category
    if (subject) filter.subject = subject
    if (gradeLevel) filter.gradeLevel = gradeLevel
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ]
    }

    const notes = await Note.find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
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

export const getNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      })
    }

    // Check if user has purchased the note
    let hasPurchased = false
    if (req.user && req.user.role !== 'guest') {
      const user = await User.findById(req.user._id)
      hasPurchased = user.purchasedNotes.some(
        (purchased) => purchased.note.toString() === req.params.id
      )
    }

    // Increment views
    note.views = (note.views || 0) + 1
    await note.save()

    res.status(200).json({
      success: true,
      data: {
        ...note.toObject(),
        hasPurchased,
        // Only return file URL if purchased or free
        fileUrl: hasPurchased || note.price === 0 ? note.fileUrl : undefined,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

export const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found',
      })
    }

    // Check if user has purchased the note
    if (note.price > 0) {
      const user = await User.findById(req.user._id)
      const hasPurchased = user.purchasedNotes.some(
        (purchased) => purchased.note.toString() === req.params.id
      )

      if (!hasPurchased) {
        return res.status(403).json({
          success: false,
          message: 'You need to purchase this note to download it',
        })
      }

      // Increment download count for user
      const purchasedNote = user.purchasedNotes.find(
        (p) => p.note.toString() === req.params.id
      )
      purchasedNote.downloadCount += 1
      await user.save()
    }

    // Increment note downloads
    note.downloads += 1
    await note.save()

    res.status(200).json({
      success: true,
      data: {
        downloadUrl: note.fileUrl,
        fileName: `${note.title}.${note.fileType || 'pdf'}`,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
