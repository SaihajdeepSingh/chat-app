const express    = require('express');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const User       = require('../models/User');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 3 * 1024 * 1024 },   // 3 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/* ── GET /api/profile ── current user info ── */
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── POST /api/profile/avatar ── upload & save avatar ── */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image provided' });

  try {
    const b64     = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary — square crop, face-aware
    const result = await cloudinary.uploader.upload(dataURI, {
      folder:         'chat-app/avatars',
      resource_type:  'image',
      transformation: [
        { width: 250, height: 250, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      ],
    });

    // Save URL to DB
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');

    res.json({
      user: {
        id:     updated._id,
        name:   updated.name,
        email:  updated.email,
        avatar: updated.avatar,
      },
    });
  } catch (err) {
    console.error('Avatar upload error:', err.message);
    res.status(500).json({ message: 'Avatar upload failed. Check Cloudinary credentials.' });
  }
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Image must be under 3MB' });
  res.status(400).json({ message: err.message });
});

module.exports = router;