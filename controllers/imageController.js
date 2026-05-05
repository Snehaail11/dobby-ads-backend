const Image = require('../models/Image');
const Folder = require('../models/Folder');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// @route POST /api/images/upload
exports.uploadImage = async (req, res) => {
  try {
    const { name, folderId } = req.body;
    const userId = req.user;
    
    console.log('Upload request:', { name, folderId, userId });
    
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    
    // Handle folderId
    let actualFolderId = null;
    if (folderId && folderId !== 'null' && folderId !== 'undefined' && folderId !== '') {
      actualFolderId = folderId;
    }
    
    // If folderId provided, verify it exists
    if (actualFolderId) {
      const folder = await Folder.findOne({ _id: actualFolderId, owner: userId });
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }
    }
    
    // Check file size
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ message: 'File size exceeds 10MB limit' });
    }
    
    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    const uploadFolder = actualFolderId || 'root';
    const filePath = `user-${userId}/${uploadFolder}/${fileName}`;
    
    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload image to storage' });
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    // Save to database
    const image = new Image({
      name: name || req.file.originalname,
      url: urlData.publicUrl,
      size: req.file.size,
      mimeType: req.file.mimetype,
      folder: actualFolderId,
      owner: userId
    });
    
    await image.save();
    
    res.status(201).json({
      success: true,
      image: {
        id: image._id,
        name: image.name,
        url: image.url,
        size: image.size,
        sizeFormatted: formatBytes(image.size),
        mimeType: image.mimeType,
        folder: image.folder,
        uploadedAt: image.uploadedAt
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @route GET /api/images/folder/:folderId
exports.getImagesByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user;
    
    const images = await Image.find({ folder: folderId, owner: userId })
      .sort({ uploadedAt: -1 });
    
    const imagesWithFormattedSize = images.map(img => ({
      id: img._id,
      name: img.name,
      url: img.url,
      size: img.size,
      sizeFormatted: formatBytes(img.size),
      mimeType: img.mimeType,
      uploadedAt: img.uploadedAt
    }));
    
    res.json({
      success: true,
      images: imagesWithFormattedSize
    });
  } catch (err) {
    console.error('Get images error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route DELETE /api/images/:id
exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    
    const image = await Image.findOne({ _id: id, owner: userId });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Extract file path from URL
    const urlParts = image.url.split('/');
    const filePath = urlParts.slice(urlParts.indexOf('images') + 1).join('/');
    
    // Delete from Supabase
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([filePath]);
    
    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
    }
    
    // Delete from MongoDB
    await Image.deleteOne({ _id: id });
    
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};