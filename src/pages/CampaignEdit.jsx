import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Breadcrumb from '../components/common/Breadcrumb';
import FabricEditor from '../components/PostcardEditor/FabricEditor';
import campaignService from '../supabase/api/campaignService';
import newMoverService from '../supabase/api/newMoverService';
import toast from 'react-hot-toast';

const CampaignEdit = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingPostcard, setIsEditingPostcard] = useState(false);
  const [zipValidation, setZipValidation] = useState(null);
  const [isValidatingZips, setIsValidatingZips] = useState(false);

  const [formData, setFormData] = useState({
    campaign_name: '',
    target_zip_codes: ''
  });

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setIsLoading(true);
      const result = await campaignService.getCampaignById(campaignId);

      if (result.success && result.campaign) {
        setCampaign(result.campaign);
        setFormData({
          campaign_name: result.campaign.campaign_name || '',
          target_zip_codes: (result.campaign.target_zip_codes || []).join(', ')
        });
      } else {
        toast.error('Campaign not found');
        navigate('/history');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
      navigate('/history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation when ZIP codes are changed
    if (name === 'target_zip_codes') {
      setZipValidation(null);
    }
  };

  const handleValidateZips = async () => {
    try {
      setIsValidatingZips(true);

      const zipCodes = formData.target_zip_codes
        .split(',')
        .map(zip => zip.trim())
        .filter(zip => zip.length > 0);

      if (zipCodes.length === 0) {
        toast.error('Please enter ZIP codes');
        return;
      }

      const result = await newMoverService.validateZipCodes(zipCodes);
      setZipValidation(result);

      if (result.allValid) {
        toast.success(`All ${result.validZips} ZIP codes are valid!`);
      } else {
        toast.error(`${result.invalidZips} invalid ZIP code(s). Please fix before saving.`);
      }
    } catch (error) {
      console.error('Error validating ZIP codes:', error);
      toast.error('Failed to validate ZIP codes');
    } finally {
      setIsValidatingZips(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Check if ZIP codes have been validated
      if (!zipValidation || !zipValidation.allValid) {
        toast.error('Please validate all ZIP codes before saving. All ZIP codes must be valid.');
        return;
      }

      setIsSaving(true);

      // Parse ZIP codes
      const zipCodes = formData.target_zip_codes
        .split(',')
        .map(zip => zip.trim())
        .filter(zip => zip.length > 0);

      if (zipCodes.length === 0) {
        toast.error('Please enter at least one ZIP code');
        return;
      }

      // Update campaign
      const updates = {
        campaign_name: formData.campaign_name,
        target_zip_codes: zipCodes,
        status: 'draft', // Set back to draft when edited
      };

      const result = await campaignService.updateCampaign(campaignId, updates);

      if (result.success) {
        toast.success('Campaign updated successfully');
        navigate('/history');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/history');
  };

  const handleEditPostcard = () => {
    setIsEditingPostcard(true);
  };

  const handleCloseEditor = () => {
    setIsEditingPostcard(false);
  };

  const handleSavePostcard = async (designData) => {
    try {
      toast.loading('Saving postcard design...', { id: 'save-design' });

      // designData contains { designUrl, previewUrl }
      const result = await campaignService.saveCampaignDesign(
        campaignId,
        designData.designUrl,
        designData.previewUrl
      );

      if (result.success) {
        toast.success('Postcard design saved!', { id: 'save-design' });

        // Reload campaign to get updated preview
        await loadCampaign();
        setIsEditingPostcard(false);
      }
    } catch (error) {
      console.error('Error saving postcard design:', error);
      toast.error('Failed to save postcard design', { id: 'save-design' });
    }
  };

  const breadcrumbItems = [
    { label: 'History', link: '/history' },
    { label: 'Edit Campaign' }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="campaign-edit-loading">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading campaign...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return null;
  }

  // If editing postcard, show full-screen editor
  if (isEditingPostcard) {
    const templateData = {
      id: campaign.template_id,
      name: campaign.template_name || 'Campaign Design',
      psdPath: campaign.postcard_design_url, // Cloudinary URL to .scene file
      preview: campaign.postcard_preview_url
    };

    return (
      <DashboardLayout>
        <div className="campaign-edit-page-editor">
          <FabricEditor
            selectedTemplate={templateData}
            onBack={handleCloseEditor}
            onSave={handleSavePostcard}
            campaignId={campaignId}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="campaign-edit-page">
        <Breadcrumb items={breadcrumbItems} />

        <div className="edit-header">
          <h1 className="edit-title">Edit Campaign</h1>
          <p className="edit-subtitle">Make changes to your campaign details and targeting information.</p>
        </div>

        <div className="edit-content">
          <div className="edit-card">
            <div className="card-section">
              <h3 className="section-title">Campaign Details</h3>

              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input
                  type="text"
                  name="campaign_name"
                  className="form-input"
                  value={formData.campaign_name}
                  onChange={handleInputChange}
                  placeholder="Enter campaign name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target ZIP Codes</label>
                <textarea
                  name="target_zip_codes"
                  className="form-textarea"
                  value={formData.target_zip_codes}
                  onChange={handleInputChange}
                  placeholder="Enter ZIP codes separated by commas (e.g., 10001, 10002, 10003)"
                  rows={4}
                />
                <p className="form-help">Separate multiple ZIP codes with commas</p>

                {/* Validate ZIP Codes Button */}
                <div className="validate-button-wrapper">
                  <motion.button
                    type="button"
                    className="validate-zips-button"
                    onClick={handleValidateZips}
                    disabled={isValidatingZips || !formData.target_zip_codes.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isValidatingZips ? (
                      <>
                        <div className="button-spinner"></div>
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Validate ZIP Codes
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Validation Results */}
                {zipValidation && (
                  <motion.div
                    className="validation-results"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="validation-summary">
                      <div className={`summary-stat ${zipValidation.allValid ? 'success' : 'warning'}`}>
                        <div className="stat-icon">
                          {zipValidation.allValid ? (
                            <CheckCircle size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>
                        <div className="stat-content">
                          <div className="stat-label">Valid ZIP Codes</div>
                          <div className="stat-value">{zipValidation.validZips} / {zipValidation.totalZipCodes}</div>
                        </div>
                      </div>

                      {zipValidation.invalidZips > 0 && (
                        <div className="summary-stat error">
                          <div className="stat-icon">
                            <XCircle size={20} />
                          </div>
                          <div className="stat-content">
                            <div className="stat-label">Invalid ZIP Codes</div>
                            <div className="stat-value">{zipValidation.invalidZips}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Show invalid ZIPs */}
                    {zipValidation.invalidZips > 0 && (
                      <div className="invalid-zips-list">
                        <p className="invalid-zips-title">Invalid ZIP Codes:</p>
                        <div className="invalid-zips-items">
                          {zipValidation.results
                            .filter(r => !r.isValid)
                            .map((result, index) => (
                              <span key={index} className="invalid-zip-badge">
                                {result.zipCode}
                              </span>
                            ))}
                        </div>
                        <p className="invalid-zips-help">Please remove or correct these ZIP codes before saving.</p>
                      </div>
                    )}

                    {zipValidation.allValid && (
                      <div className="validation-success-message">
                        <CheckCircle size={16} />
                        <span>All ZIP codes are valid and ready to save!</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <div className="card-section">
              <div className="section-header">
                <h3 className="section-title">Postcard Design</h3>
                <motion.button
                  className="edit-postcard-button"
                  onClick={handleEditPostcard}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit3 size={16} />
                  Edit Design
                </motion.button>
              </div>
              <div className="preview-container">
                {campaign.postcard_preview_url ? (
                  <motion.img
                    src={campaign.postcard_preview_url}
                    alt="Postcard preview"
                    className="preview-image"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                      <rect x="10" y="20" width="60" height="40" rx="4" stroke="#CBD5E0" strokeWidth="2"/>
                      <circle cx="25" cy="35" r="5" fill="#E2E8F0"/>
                      <path d="M10 50L30 35L45 45L70 25" stroke="#CBD5E0" strokeWidth="2"/>
                    </svg>
                    <p>No preview available</p>
                  </div>
                )}
              </div>
              <p className="preview-note">
                Click "Edit Design" to customize your postcard using the professional editor
              </p>
            </div>

            <div className="card-section">
              <h3 className="section-title">Campaign Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Current Status</span>
                  <span className={`info-value status-${campaign.status}`}>
                    {campaign.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Postcards Sent</span>
                  <span className="info-value">{campaign.postcards_sent?.toLocaleString() || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Total Cost</span>
                  <span className="info-value">${campaign.total_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Created</span>
                  <span className="info-value">
                    {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="edit-footer">
          <motion.button
            className="footer-button cancel-button"
            onClick={handleCancel}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <div className="save-button-wrapper">
            <motion.button
              className="footer-button save-button"
              onClick={handleSaveChanges}
              disabled={isSaving || !zipValidation || !zipValidation.allValid}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(32, 178, 170, 0.3)" }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </motion.button>
            {(!zipValidation || !zipValidation.allValid) && (
              <p className="save-button-help">Please validate all ZIP codes before saving</p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .campaign-edit-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 200px);
          width: 100%;
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #E2E8F0;
          border-top-color: #20B2AA;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-content p {
          color: #718096;
          font-size: 14px;
          margin: 0;
        }

        .campaign-edit-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
        }

        .campaign-edit-page-editor {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          display: flex;
          min-height: calc(100vh - 80px);
        }

        .edit-header {
          margin-bottom: 32px;
        }

        .edit-title {
          font-size: 28px;
          font-weight: 700;
          color: #1A202C;
          margin-bottom: 8px;
        }

        .edit-subtitle {
          font-size: 14px;
          color: #718096;
          line-height: 1.6;
        }

        .edit-content {
          margin-bottom: 24px;
        }

        .edit-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
        }

        .card-section {
          padding: 24px;
          border-bottom: 1px solid #E2E8F0;
        }

        .card-section:last-child {
          border-bottom: none;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1A202C;
          margin: 0;
        }

        .edit-postcard-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          background: #20B2AA;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-postcard-button:hover {
          background: #17a097;
          box-shadow: 0 4px 12px rgba(32, 178, 170, 0.3);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          font-size: 14px;
          border: 1.5px solid #E2E8F0;
          border-radius: 8px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #20B2AA;
          box-shadow: 0 0 0 3px rgba(32, 178, 170, 0.1);
        }

        .form-textarea {
          resize: vertical;
        }

        .form-help {
          margin-top: 6px;
          font-size: 13px;
          color: #718096;
        }

        .preview-container {
          background: #F7FAFC;
          border: 2px dashed #E2E8F0;
          border-radius: 8px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 240px;
          margin-bottom: 12px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .preview-placeholder {
          text-align: center;
          color: #A0AEC0;
        }

        .preview-placeholder svg {
          margin-bottom: 12px;
        }

        .preview-placeholder p {
          font-size: 14px;
          margin: 0;
        }

        .preview-note {
          font-size: 13px;
          color: #718096;
          margin: 0;
          margin-top: 12px;
          padding: 12px 16px;
          background: #F7FAFC;
          border-left: 3px solid #20B2AA;
          border-radius: 4px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .info-label {
          font-size: 13px;
          color: #718096;
          font-weight: 500;
        }

        .info-value {
          font-size: 16px;
          color: #1A202C;
          font-weight: 600;
        }

        .info-value.status-active,
        .info-value.status-approved {
          color: #059669;
        }

        .info-value.status-pending_review {
          color: #D97706;
        }

        .info-value.status-rejected {
          color: #DC2626;
        }

        .info-value.status-draft {
          color: #4F46E5;
        }

        .edit-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid #E2E8F0;
        }

        .footer-button {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cancel-button {
          background: white;
          color: #4A5568;
          border: 1.5px solid #E2E8F0;
        }

        .cancel-button:hover:not(:disabled) {
          background: #F7FAFC;
          border-color: #CBD5E0;
        }

        .save-button {
          background: #20B2AA;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          background: #17a097;
          box-shadow: 0 4px 12px rgba(32, 178, 170, 0.3);
        }

        .footer-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-button-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .save-button-help {
          font-size: 12px;
          color: #DC2626;
          margin: 0;
          font-weight: 500;
        }

        /* Validation UI Styles */
        .validate-button-wrapper {
          margin-top: 16px;
        }

        .validate-zips-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          background: #20B2AA;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .validate-zips-button:hover:not(:disabled) {
          background: #17a097;
          box-shadow: 0 4px 12px rgba(32, 178, 170, 0.3);
        }

        .validate-zips-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff40;
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .validation-results {
          margin-top: 20px;
          padding: 20px;
          background: #F7FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          overflow: hidden;
        }

        .validation-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .summary-stat {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 2px solid #E2E8F0;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .summary-stat.success {
          border-color: #10B981;
          background: #ECFDF5;
        }

        .summary-stat.success .stat-icon {
          color: #10B981;
        }

        .summary-stat.warning {
          border-color: #F59E0B;
          background: #FFFBEB;
        }

        .summary-stat.warning .stat-icon {
          color: #F59E0B;
        }

        .summary-stat.error {
          border-color: #EF4444;
          background: #FEF2F2;
        }

        .summary-stat.error .stat-icon {
          color: #EF4444;
        }

        .stat-icon {
          flex-shrink: 0;
        }

        .stat-content {
          flex: 1;
        }

        .stat-label {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          color: #1F2937;
          font-weight: 700;
        }

        .invalid-zips-list {
          margin-top: 16px;
          padding: 16px;
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          border-radius: 8px;
        }

        .invalid-zips-title {
          font-size: 13px;
          color: #991B1B;
          font-weight: 600;
          margin: 0 0 12px 0;
        }

        .invalid-zips-items {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .invalid-zip-badge {
          display: inline-block;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #991B1B;
          background: white;
          border: 1px solid #FCA5A5;
          border-radius: 6px;
        }

        .invalid-zips-help {
          font-size: 12px;
          color: #DC2626;
          margin: 0;
          font-weight: 500;
        }

        .validation-success-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #ECFDF5;
          border: 1px solid #10B981;
          border-radius: 8px;
          color: #047857;
          font-size: 13px;
          font-weight: 600;
          margin-top: 16px;
        }

        .validation-success-message svg {
          flex-shrink: 0;
          color: #10B981;
        }

        @media (max-width: 768px) {
          .campaign-edit-page {
            padding: 16px;
          }

          .edit-title {
            font-size: 24px;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .validation-summary {
            flex-direction: column;
          }

          .summary-stat {
            width: 100%;
          }

          .edit-footer {
            flex-direction: column-reverse;
          }

          .footer-button {
            width: 100%;
          }

          .save-button-wrapper {
            width: 100%;
            align-items: stretch;
          }

          .save-button-help {
            text-align: center;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default CampaignEdit;
