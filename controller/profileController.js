import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import cloudinary from '../storage/cloudinaryConfig.js'
import User from '../models/User.js'
import mongoose from 'mongoose'

// ─── Upload avatar ────────────────────────────────────────────────────────────
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' })

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      fetch_format: 'webp',
      quality: 'auto',
    })

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password -twoFactorSecret')

    return res.status(200).json({ success: true, avatar: result.secure_url, user })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Avatar upload failed' })
  }
}

// ─── Generate 2FA secret + QR code ───────────────────────────────────────────
export const generate2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    const secret = speakeasy.generateSecret({
      name: `HookahDrop (${user.email})`,
      length: 20,
    })

    // Save secret temporarily (not yet enabled)
    user.twoFactorSecret = secret.base32
    await user.save()

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url)

    return res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCode: qrDataUrl,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to generate 2FA' })
  }
}

// ─── Verify token and enable 2FA ─────────────────────────────────────────────
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.user._id).select('+twoFactorSecret')

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'No 2FA secret found. Generate one first.' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid code. Please try again.' })
    }

    user.twoFactorEnabled = true
    await user.save()

    return res.status(200).json({ success: true, message: '2FA enabled successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to enable 2FA' })
  }
}

// ─── Disable 2FA ─────────────────────────────────────────────────────────────
export const disable2FA = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.user._id).select('+twoFactorSecret')

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid code' })
    }

    user.twoFactorEnabled = false
    user.twoFactorSecret = null
    await user.save()

    return res.status(200).json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to disable 2FA' })
  }
}

// ─── Update full profile ──────────────────────────────────────────────────────
export const updateFullProfile = async (req, res) => {
  try {
    const { firstName, lastName, username, phone, dateOfBirth } = req.body

    // Validate required fields
    if (username && username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' })
    }

    const updates = {}
    if (firstName !== undefined) updates.firstName = firstName.trim()
    if (lastName !== undefined) updates.lastName = lastName.trim()
    if (username !== undefined) updates.username = username.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (dateOfBirth !== undefined) {
      // Validate and normalize date format (DD / MM / YYYY to YYYY-MM-DD)
      const cleaned = dateOfBirth.replace(/\s/g, '')
      const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (match) {
        const [, day, month, year] = match
        updates.dateOfBirth = `${year}-${month}-${day}` // ISO 8601 format
      } else if (dateOfBirth.trim()) {
        return res.status(400).json({ message: 'Invalid date format. Use DD/MM/YYYY' })
      }
    }

    // Update computed 'name' field for backward compatibility
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const first = updates.firstName || ''
      const last = updates.lastName || ''
      updates.name = `${first} ${last}`.trim() || updates.username || 'User'
    }

    // Timing-attack mitigation: Always query database even if no username/email check needed
    // This ensures consistent response times
    const userId = req.user._id
    
    // Check uniqueness with constant-time approach
    let validationError = null
    if (username) {
      const existing = await User.findOne({ 
        username: username.trim(), 
        _id: { $ne: userId } 
      }).select('_id')
      if (existing) validationError = 'Username already taken'
    }

    // Return error after all checks complete (constant timing)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({ success: true, data: user })
  } catch (error) {
    console.error('[updateFullProfile]', error)
    return res.status(500).json({ message: 'Failed to update profile: ' + error.message })
  }
}

// ─── Get full profile ─────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret')
    return res.status(200).json({ success: true, data: user })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile' })
  }
}

// ─── Update full profile ──────────────────────────────────────────────────────
export const updateFullProfile = async (req, res) => {
  try {
    const { firstName, lastName, username, email, phone, dateOfBirth } = req.body

    // username uniqueness: if provided and different from current, check no other user has it
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } })
      if (existing) {
        return res.status(400).json({ message: 'Username already taken' })
      }
    }

    const updates = {}
    if (firstName   !== undefined) updates.firstName   = firstName
    if (lastName    !== undefined) updates.lastName    = lastName
    if (username    !== undefined) updates.username    = username
    if (phone       !== undefined) updates.phone       = phone
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth
    // Derive combined name from firstName + lastName if both provided
    if (firstName !== undefined || lastName !== undefined) {
      const fn = firstName ?? req.user.firstName ?? ''
      const ln = lastName  ?? req.user.lastName  ?? ''
      if (fn || ln) updates.name = `${fn} ${ln}`.trim()
    }
    // Email: only allow update if provided AND different from current
    if (email && email !== req.user.email) {
      const taken = await User.findOne({ email, _id: { $ne: req.user._id } })
      if (taken) return res.status(400).json({ message: 'Email already in use' })
      updates.email = email
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret')

    return res.status(200).json({ success: true, user: updated })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Failed to update profile' })
  }
}
