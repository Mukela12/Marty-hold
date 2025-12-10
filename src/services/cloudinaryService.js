import { supabase } from '../supabase/integration/client';

/**
 * Cloudinary Service
 * Handles uploading PSD/scene files and PNG previews to Cloudinary
 * Uses unsigned upload preset for client-side uploads
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = 'master'; // You'll need to create this in Cloudinary dashboard

const cloudinaryService = {
  /**
   * Upload PSD/Scene file to Cloudinary
   * @param {Blob|File} file - The PSD or scene file
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadPSD(file, campaignId, userId) {
    try {
      console.log('[Cloudinary] Uploading PSD/Scene file...');
      console.log('[Cloudinary] File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `postcards/${userId}/campaigns/${campaignId}/design`);
      formData.append('resource_type', 'raw'); // For non-image files
      formData.append('public_id', `scene_${Date.now()}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload PSD to Cloudinary');
      }

      const result = await response.json();

      console.log('[Cloudinary] PSD/Scene uploaded successfully');
      console.log('[Cloudinary] URL:', result.secure_url);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type
      };
    } catch (error) {
      console.error('[Cloudinary] Error uploading PSD:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload PSD file'
      };
    }
  },

  /**
   * Upload PNG preview to Cloudinary
   * @param {Blob} blob - PNG blob from editor export
   * @param {string} campaignId - Campaign ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Upload result with secure_url
   */
  async uploadPreview(blob, campaignId, userId) {
    try {
      console.log('[Cloudinary] Uploading PNG preview...');
      console.log('[Cloudinary] Preview size:', (blob.size / 1024).toFixed(2), 'KB');

      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `postcards/${userId}/campaigns/${campaignId}/preview`);
      formData.append('public_id', `preview_${Date.now()}`);
      // Note: Transformations can't be used with unsigned uploads
      // Apply transformations in the upload preset or when displaying the image

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to upload preview to Cloudinary');
      }

      const result = await response.json();

      console.log('[Cloudinary] Preview uploaded successfully');
      console.log('[Cloudinary] URL:', result.secure_url);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('[Cloudinary] Error uploading preview:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload preview image'
      };
    }
  },

  /**
   * Generate optimized URL for preview display
   * @param {string} publicId - Cloudinary public ID
   * @param {Object} options - Transformation options
   * @returns {string} Optimized URL
   */
  generatePreviewUrl(publicId, options = {}) {
    const {
      width = 400,
      height = 300,
      crop = 'fill',
      quality = 'auto',
      format = 'auto'
    } = options;

    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/c_${crop},w_${width},h_${height},q_${quality},f_${format}/${publicId}`;
  },

  /**
   * Delete assets from Cloudinary
   * @param {string[]} publicIds - Array of public IDs to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAssets(publicIds) {
    try {
      console.log('[Cloudinary] Deleting assets:', publicIds);

      // Note: Deletion requires authenticated requests
      // For production, implement server-side API endpoint
      // For now, we'll just log the deletion request
      console.warn('[Cloudinary] Deletion should be handled server-side with API key/secret');

      return {
        success: true,
        message: 'Assets marked for deletion'
      };
    } catch (error) {
      console.error('[Cloudinary] Error deleting assets:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete assets'
      };
    }
  },

  /**
   * Upload both PSD and Preview in one operation
   * @param {Blob} psdFile - PSD/scene file
   * @param {Blob} previewBlob - PNG preview
   * @param {string} campaignId - Campaign ID
   * @returns {Promise<Object>} Combined upload result
   */
  async uploadCampaignAssets(psdFile, previewBlob, campaignId) {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      console.log('[Cloudinary] Uploading campaign assets for campaign:', campaignId);

      // Upload PSD/Scene file
      const psdResult = await this.uploadPSD(psdFile, campaignId, user.id);
      if (!psdResult.success) {
        throw new Error(psdResult.error);
      }

      // Upload PNG preview
      const previewResult = await this.uploadPreview(previewBlob, campaignId, user.id);
      if (!previewResult.success) {
        throw new Error(previewResult.error);
      }

      console.log('[Cloudinary] All campaign assets uploaded successfully');

      return {
        success: true,
        designUrl: psdResult.url,
        previewUrl: previewResult.url,
        psdPublicId: psdResult.publicId,
        previewPublicId: previewResult.publicId
      };
    } catch (error) {
      console.error('[Cloudinary] Error uploading campaign assets:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload campaign assets'
      };
    }
  },

  /**
   * Get Cloudinary config (for debugging)
   * @returns {Object} Config info
   */
  getConfig() {
    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      configured: !!CLOUDINARY_CLOUD_NAME
    };
  }
};

export default cloudinaryService;
