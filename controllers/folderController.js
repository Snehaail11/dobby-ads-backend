const Folder = require('../models/Folder');
const Image = require('../models/Image');

// Helper: Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper: Calculate folder size recursively
async function calculateFolderSize(folderId, userId) {
  // Get all images directly in this folder
  const images = await Image.find({ folder: folderId, owner: userId });
  let totalSize = images.reduce((sum, img) => sum + img.size, 0);
  
  // Get all subfolders and recursively calculate their sizes
  const subfolders = await Folder.find({ parentFolder: folderId, owner: userId });
  for (const subfolder of subfolders) {
    totalSize += await calculateFolderSize(subfolder._id, userId);
  }
  
  return totalSize;
}

// @route POST /api/folders
// @desc Create a new folder (supports nested)
exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolderId = null } = req.body;
    const userId = req.user;
    
    // Validation
    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    
    // Check if folder with same name exists at same level
    const existingFolder = await Folder.findOne({
      name,
      parentFolder: parentFolderId,
      owner: userId
    });
    
    if (existingFolder) {
      return res.status(400).json({ message: 'Folder already exists at this location' });
    }
    
    // Build folder path for breadcrumb
    let folderPath = '';
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);
      if (parentFolder) {
        folderPath = parentFolder.path ? `${parentFolder.path}/${parentFolder.name}` : parentFolder.name;
      }
    }
    
    const folder = new Folder({
      name,
      parentFolder: parentFolderId,
      owner: userId,
      path: folderPath
    });
    
    await folder.save();
    
    res.status(201).json({
      success: true,
      folder: {
        id: folder._id,
        name: folder.name,
        parentFolder: folder.parentFolder,
        path: folder.path,
        createdAt: folder.createdAt
      }
    });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/folders
// @desc Get all folders for user (with sizes)
exports.getFolders = async (req, res) => {
  try {
    const userId = req.user;
    const { parentFolderId = null } = req.query;
    
    // Get folders at specified level
    const folders = await Folder.find({
      owner: userId,
      parentFolder: parentFolderId === 'null' ? null : parentFolderId
    }).sort({ createdAt: -1 });
    
    // Calculate size for each folder
    const foldersWithSize = await Promise.all(
      folders.map(async (folder) => {
        const size = await calculateFolderSize(folder._id, userId);
        return {
          id: folder._id,
          name: folder.name,
          parentFolder: folder.parentFolder,
          path: folder.path,
          size: size,
          sizeFormatted: formatBytes(size),
          createdAt: folder.createdAt
        };
      })
    );
    
    // Get breadcrumb path
    let breadcrumb = [];
    if (parentFolderId && parentFolderId !== 'null') {
      let currentFolder = await Folder.findById(parentFolderId);
      while (currentFolder) {
        breadcrumb.unshift({
          id: currentFolder._id,
          name: currentFolder.name
        });
        currentFolder = currentFolder.parentFolder ? await Folder.findById(currentFolder.parentFolder) : null;
      }
    }
    
    res.json({
      success: true,
      folders: foldersWithSize,
      breadcrumb,
      currentFolderId: parentFolderId === 'null' ? null : parentFolderId
    });
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/folders/:id/size
// @desc Get size of a specific folder
exports.getFolderSize = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    
    const folder = await Folder.findOne({ _id: id, owner: userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    const size = await calculateFolderSize(id, userId);
    res.json({
      success: true,
      folderId: id,
      folderName: folder.name,
      size: size,
      sizeFormatted: formatBytes(size)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route PUT /api/folders/:id
// @desc Rename folder
exports.renameFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user;
    
    if (!name) {
      return res.status(400).json({ message: 'New name is required' });
    }
    
    const folder = await Folder.findOne({ _id: id, owner: userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    folder.name = name;
    await folder.save();
    
    res.json({ 
      success: true, 
      folder: { id: folder._id, name: folder.name } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @route DELETE /api/folders/:id
// @desc Delete folder and all contents (cascade)
exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    
    // Check if folder exists
    const folder = await Folder.findOne({ _id: id, owner: userId });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    
    // Delete all images in this folder
    await Image.deleteMany({ folder: id, owner: userId });
    
    // Delete all subfolders recursively
    async function deleteSubfolders(parentId) {
      const subfolders = await Folder.find({ parentFolder: parentId, owner: userId });
      for (const subfolder of subfolders) {
        await Image.deleteMany({ folder: subfolder._id, owner: userId });
        await deleteSubfolders(subfolder._id);
        await Folder.deleteOne({ _id: subfolder._id });
      }
    }
    
    await deleteSubfolders(id);
    
    // Delete the main folder
    await Folder.deleteOne({ _id: id, owner: userId });
    
    res.json({ success: true, message: 'Folder and all contents deleted' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};