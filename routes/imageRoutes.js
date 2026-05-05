const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageController = require('../controllers/imageController');
const auth = require('../middleware/auth');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(auth);

// Image routes - MAKE SURE CONTROLLER METHODS EXIST
router.post('/upload', upload.single('image'), imageController.uploadImage);
router.get('/folder/:folderId', imageController.getImagesByFolder);
router.delete('/:id', imageController.deleteImage);

module.exports = router;