import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Copy,
  Pause,
  Play,
  Trash2,
  Calendar,
  DollarSign,
  Mail,
  Target,
  TrendingUp,
  MapPin
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import ConfirmationModal from '../components/common/ConfirmationModal';
import campaignService from '../supabase/api/campaignService';
import newMoverService from '../supabase/api/newMoverService';
import toast from 'react-hot-toast';
import './CampaignDetails.css';

const CampaignDetails = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMovers, setNewMovers] = useState([]);
  const [newMoversLoading, setNewMoversLoading] = useState(false);
  const [newMoversTotalCount, setNewMoversTotalCount] = useState(0);
  const [showAllMovers, setShowAllMovers] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load campaign data
  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const result = await campaignService.getCampaignById(campaignId);

      if (result.success) {
        setCampaign(result.campaign);

        // Load new movers data
        await loadNewMoversData(result.campaign);
      } else {
        setError('Campaign not found');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      setError('Failed to load campaign details');
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const loadNewMoversData = async (campaignData) => {
    try {
      setNewMoversLoading(true);

      // Fetch new movers based on campaign ZIP codes
      if (campaignData.target_zip_codes && campaignData.target_zip_codes.length > 0) {
        const result = await newMoverService.getByCampaignZipCodes(
          campaignData.target_zip_codes,
          showAllMovers ? 1000 : 50 // Show 50 by default, 1000 when "Show All" is clicked
        );

        if (result.success) {
          setNewMovers(result.data);
          setNewMoversTotalCount(result.totalCount);
        }
      }
    } catch (error) {
      console.error('Error loading new movers:', error);
      // Don't show error toast - this is supplementary data
    } finally {
      setNewMoversLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleEdit = () => {
    navigate(`/campaign/${campaignId}/edit`);
  };

  const handleDuplicate = async () => {
    try {
      toast.loading('Duplicating campaign...', { id: 'duplicate' });
      const result = await campaignService.duplicateCampaign(campaignId);

      if (result.success) {
        toast.success('Campaign duplicated!', { id: 'duplicate' });
        navigate('/dashboard');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      toast.error('Failed to duplicate campaign', { id: 'duplicate' });
    }
  };

  const handleToggleStatus = async () => {
    if (!campaign) return;

    try {
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      toast.loading(`${newStatus === 'active' ? 'Activating' : 'Pausing'} campaign...`, { id: 'toggle-status' });

      const result = newStatus === 'active'
        ? await campaignService.launchCampaign(campaignId)
        : await campaignService.pauseCampaign(campaignId);

      if (result.success) {
        setCampaign(result.campaign);
        toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}!`, { id: 'toggle-status' });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update campaign status', { id: 'toggle-status' });
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      toast.loading('Deleting campaign...', { id: 'delete' });
      const result = await campaignService.deleteCampaign(campaignId);

      if (result.success) {
        toast.success('Campaign deleted successfully', { id: 'delete' });
        navigate('/dashboard');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign', { id: 'delete' });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="campaign-details-loading">
          <div className="loading-spinner"></div>
          <p>Loading campaign details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !campaign) {
    return (
      <DashboardLayout>
        <div className="campaign-details-error">
          <h2>Campaign Not Found</h2>
          <p>{error || 'The campaign you are looking for does not exist.'}</p>
          <button onClick={handleBack} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const deliveryRate = campaign.postcards_sent > 0
    ? ((campaign.postcards_delivered / campaign.postcards_sent) * 100).toFixed(1)
    : 0;

  return (
    <DashboardLayout>
      <div className="campaign-details">
        {/* Header */}
        <div className="campaign-details-header">
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="campaign-title-section">
            <h1>{campaign.campaign_name}</h1>
            <span className={`status-badge status-${campaign.status}`}>
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>

          <div className="campaign-actions">
            <button onClick={handleEdit} className="action-btn edit">
              <Edit size={18} />
              Edit
            </button>
            <button onClick={handleDuplicate} className="action-btn duplicate">
              <Copy size={18} />
              Duplicate
            </button>
            <button onClick={handleToggleStatus} className="action-btn toggle">
              {campaign.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
              {campaign.status === 'active' ? 'Pause' : 'Activate'}
            </button>
            <button onClick={handleDelete} className="action-btn delete">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="campaign-details-grid">
          {/* Left Column - Preview and Stats */}
          <div className="campaign-left-column">
            {/* Postcard Preview */}
            <motion.div
              className="campaign-preview-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Postcard Design</h3>
              <div className="preview-image-container">
                {campaign.postcard_preview_url ? (
                  <img
                    src={campaign.postcard_preview_url}
                    alt={campaign.campaign_name}
                    className="preview-image"
                  />
                ) : (
                  <div className="no-preview">No preview available</div>
                )}
              </div>
              <div className="preview-info">
                <span className="template-name">{campaign.template_name || 'Custom Template'}</span>
              </div>
            </motion.div>

            {/* Key Statistics */}
            <motion.div
              className="campaign-stats-grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="stat-card">
                <div className="stat-icon">
                  <Mail size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Postcards Sent</span>
                  <span className="stat-value">{campaign.postcards_sent.toLocaleString()}</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Delivered</span>
                  <span className="stat-value">{campaign.postcards_delivered.toLocaleString()}</span>
                  <span className="stat-subtext">{deliveryRate}% rate</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <Target size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Responses</span>
                  <span className="stat-value">{campaign.responses.toLocaleString()}</span>
                  <span className="stat-subtext">{campaign.response_rate.toFixed(2)}% rate</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Total Cost</span>
                  <span className="stat-value">${parseFloat(campaign.total_cost).toLocaleString()}</span>
                  <span className="stat-subtext">${parseFloat(campaign.price_per_postcard).toFixed(2)}/postcard</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Details and Analytics */}
          <div className="campaign-right-column">
            {/* Campaign Information */}
            <motion.div
              className="campaign-info-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h3>Campaign Information</h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">
                    <Calendar size={16} />
                    Created
                  </span>
                  <span className="info-value">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>

                {campaign.launched_at && (
                  <div className="info-row">
                    <span className="info-label">
                      <Calendar size={16} />
                      Launched
                    </span>
                    <span className="info-value">
                      {new Date(campaign.launched_at).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="info-row">
                  <span className="info-label">
                    <MapPin size={16} />
                    Targeting
                  </span>
                  <span className="info-value">
                    {campaign.target_zip_codes && campaign.target_zip_codes.length > 0
                      ? `${campaign.target_zip_codes.length} ZIP Code${campaign.target_zip_codes.length !== 1 ? 's' : ''}`
                      : campaign.target_radius
                      ? `${campaign.target_radius} mile radius`
                      : 'Not specified'}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">
                    <Target size={16} />
                    Total Recipients
                  </span>
                  <span className="info-value">
                    {campaign.total_recipients.toLocaleString()}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">
                    <DollarSign size={16} />
                    Payment Status
                  </span>
                  <span className={`info-value payment-status-${campaign.payment_status}`}>
                    {campaign.payment_status.charAt(0).toUpperCase() + campaign.payment_status.slice(1)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Target ZIP Codes */}
            {campaign.target_zip_codes && campaign.target_zip_codes.length > 0 && (
              <motion.div
                className="campaign-targeting-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <h3>Target ZIP Codes</h3>
                <div className="zip-codes-list">
                  {campaign.target_zip_codes.slice(0, 20).map((zip, index) => (
                    <span key={index} className="zip-code-badge">{zip}</span>
                  ))}
                  {campaign.target_zip_codes.length > 20 && (
                    <span className="zip-code-badge more">
                      +{campaign.target_zip_codes.length - 20} more
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Targeted Addresses from Melissa Data */}
            {campaign.target_zip_codes && campaign.target_zip_codes.length > 0 && (
              <motion.div
                className="campaign-addresses-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <div className="addresses-header">
                  <h3>Targeted Addresses ({newMoversTotalCount.toLocaleString()} New Movers)</h3>
                  {newMoversTotalCount > 50 && !showAllMovers && (
                    <button
                      onClick={() => {
                        setShowAllMovers(true);
                        loadNewMoversData(campaign);
                      }}
                      className="show-all-btn"
                    >
                      Show All
                    </button>
                  )}
                </div>

                {newMoversLoading ? (
                  <div className="movers-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading addresses...</p>
                  </div>
                ) : newMovers.length > 0 ? (
                  <div className="addresses-table-container">
                    <table className="addresses-table">
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>City, State ZIP</th>
                          <th>Move Date</th>
                          <th>Sent Postcards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newMovers.map((mover, index) => (
                          <tr key={mover.id || index}>
                            <td className="address-cell">{mover.address_line || 'N/A'}</td>
                            <td className="location-cell">
                              {mover.city}, {mover.state} {mover.zip_code}
                            </td>
                            <td className="date-cell">
                              {mover.move_effective_date
                                ? new Date(mover.move_effective_date).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td className="sent-cell">No</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {newMovers.length < newMoversTotalCount && (
                      <p className="showing-count">
                        Showing {newMovers.length} of {newMoversTotalCount.toLocaleString()} addresses
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="no-movers">
                    <p>No new mover data available for the targeted ZIP codes.</p>
                    <p className="help-text">
                      New mover data is fetched from Melissa Data API during campaign targeting.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        message={
          campaign ? (
            <>
              Are you sure you want to delete <strong>{campaign.campaign_name}</strong>?
              This action cannot be undone.
            </>
          ) : (
            'Are you sure you want to delete this campaign? This action cannot be undone.'
          )
        }
        confirmText="Delete Campaign"
        cancelText="Cancel"
        severity="danger"
        isLoading={isDeleting}
        loadingText="Deleting..."
      />
    </DashboardLayout>
  );
};

export default CampaignDetails;
