const express    = require('express');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, png, gif, webp)'));
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image file provided' });

  try {
    const b64     = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder:         'chat-app',
      resource_type:  'image',
      transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good' }],
    });

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    res.status(500).json({ message: 'Image upload failed. Check Cloudinary credentials.' });
  }
});

router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Image must be under 5MB' });
  res.status(400).json({ message: err.message || 'Upload error' });
});

module.exports = router;
