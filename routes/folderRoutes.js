const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const auth = require('../middleware/auth');

// All folder routes require authentication
router.use(auth);

// Folder CRUD operations
router.post('/', folderController.createFolder);
router.get('/', folderController.getFolders);
router.get('/:id/size', folderController.getFolderSize);
router.put('/:id', folderController.renameFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;