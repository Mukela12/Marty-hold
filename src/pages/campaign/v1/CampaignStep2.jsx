import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import ProcessLayout from '../../../components/process/ProcessLayout';
import LoadingScreen from '../../../components/onboarding/LoadingScreen';
import OnboardingFooter from '../../../components/onboarding/OnboardingFooter';
import TemplateCardSkeleton from '../../../components/common/TemplateCardSkeleton';
import supabaseCompanyService from '../../../supabase/api/companyService';
import campaignService from '../../../supabase/api/campaignService';
import toast from 'react-hot-toast';
import '../../onboarding/onboarding-step2-redesign.css';

const CampaignStep2 = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [error, setError] = useState(null);

  const totalSteps = 5;

  // Business data state
  const [businessData, setBusinessData] = useState({
    logo: 'Logo',
    name: 'Your Business',
    offer: 'Free small coffee with your first pastry',
    tagline: '"New in Town? Let\'s caffeinate!"',
    callToAction: 'Bring this postcard in to redeem your discount',
    address1: '3900 Morse Rd, Columbus, OH',
    address2: '43219, United States',
    website: 'company@business.com',
    footer: '"Perfect to start the day, Good Staff, Delicious"',
    colors: null
  });

  const templatesPerPage = 4;
  const totalPages = Math.ceil(templates.length / templatesPerPage);

  // Load templates from JSON and business data on mount
  useEffect(() => {
    const loadTemplatesAndData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load campaign data from Step 1 localStorage
        const campaignData = localStorage.getItem('newCampaignData');
        if (campaignData) {
          const parsedData = JSON.parse(campaignData);
          setBusinessData(prevData => ({
            ...prevData,
            name: parsedData.brandData?.name || 'Your Business',
            website: parsedData.website || prevData.website
          }));
        }

        // Load brand colors from Supabase
        try {
          const companyData = await supabaseCompanyService.getCompanyInfo();
          if (companyData) {
            console.log('Loaded company data from Supabase:', companyData);

            // Parse color_palette if it's a string
            let colorPalette = companyData.color_palette;
            if (typeof colorPalette === 'string') {
              try {
                colorPalette = JSON.parse(colorPalette);
              } catch (e) {
                console.warn('Could not parse color_palette:', e);
                colorPalette = [];
              }
            }

            setBusinessData(prevData => ({
              ...prevData,
              name: companyData.name || prevData.name,
              colors: {
                primary: companyData.primary_color,
                secondary: companyData.secondary_color,
                palette: Array.isArray(colorPalette) ? colorPalette : []
              },
              logo: companyData.logo_url
            }));
          }
        } catch (companyError) {
          console.warn('Could not load company data:', companyError);
        }

        // Load templates from templates.json
        console.log('Loading templates from templates.json...');
        const cacheBuster = Date.now();
        const response = await fetch(`/templates.json?v=${cacheBuster}`);
        if (!response.ok) {
          throw new Error(`Failed to load templates: ${response.statusText}`);
        }

        const allTemplates = await response.json();
        console.log('Loaded templates:', allTemplates);

        // Filter only available templates with PSD files and exclude 2-sided templates
        const availableTemplates = allTemplates.filter(template =>
          template.available &&
          template.psdFile &&
          template.psdFile.endsWith('.psd') &&
          template.sides !== 2  // Only show 1-sided templates
        );

        console.log(`Found ${availableTemplates.length} available 1-sided PSD templates`);

        if (availableTemplates.length === 0) {
          throw new Error('No available PSD templates found');
        }

        setTemplates(availableTemplates);

        setTimeout(() => {
          setIsLoading(false);
        }, 1500);

      } catch (err) {
        console.error('Failed to load templates:', err);
        setError(err.message || 'Failed to load templates. Please refresh the page.');
        setIsLoading(false);
      }
    };

    loadTemplatesAndData();
  }, []);

  // Handlers
  const getCurrentPageTemplates = () => {
    const startIndex = (currentPage - 1) * templatesPerPage;
    const endIndex = startIndex + templatesPerPage;
    return templates.slice(startIndex, endIndex);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setCurrentPreviewIndex(templates.findIndex(t => t.id === template.id));
  };

  const handleBack = () => {
    if (selectedTemplate) {
      setShowLeaveModal(true);
    } else {
      navigate('/campaign/step1');
    }
  };

  const handleContinue = async () => {
    if (selectedTemplate) {
      try {
        toast.loading('Saving template selection...', { id: 'save-template' });

        // Get campaign data and ID from Step 1
        const campaignData = localStorage.getItem('newCampaignData');
        const parsedCampaignData = campaignData ? JSON.parse(campaignData) : {};

        const campaignId = parsedCampaignData.campaignId;

        if (!campaignId) {
          throw new Error('Campaign ID not found. Please restart from Step 1.');
        }

        // Update existing campaign with template information
        const updateData = {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name
        };

        const result = await campaignService.updateCampaign(campaignId, updateData);

        if (!result.success) {
          throw new Error('Failed to update campaign with template');
        }

        console.log('Campaign updated with template:', campaignId);

        // Store campaign ID and template data for Step 3
        localStorage.setItem('currentCampaignId', campaignId);
        localStorage.setItem('campaignSelectedTemplate', JSON.stringify(selectedTemplate));
        localStorage.setItem('currentCampaignStep', '3');

        toast.success('Template saved!', { id: 'save-template' });
        navigate('/campaign/step3');
      } catch (error) {
        console.error('Error updating campaign:', error);
        toast.error('Failed to save template. Please try again.', { id: 'save-template' });
      }
    }
  };

  const nextPreview = () => {
    if (currentPreviewIndex < templates.length - 1) {
      const nextIndex = currentPreviewIndex + 1;
      setCurrentPreviewIndex(nextIndex);
      setSelectedTemplate(templates[nextIndex]);
    }
  };

  const prevPreview = () => {
    if (currentPreviewIndex > 0) {
      const prevIndex = currentPreviewIndex - 1;
      setCurrentPreviewIndex(prevIndex);
      setSelectedTemplate(templates[prevIndex]);
    }
  };

  const getTemplatePreviewUrl = (template) => {
    if (template.preview) {
      console.log(`Loading preview for ${template.name}: ${template.preview}`);
      return template.preview;
    }

    console.log(`No preview available for ${template.name}, using placeholder`);
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${template.primaryColor || '#f7fafc'}"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white">
          ${template.name}
        </text>
        <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#ffffff80">
          Loading Preview...
        </text>
      </svg>
    `)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <ProcessLayout currentStep={2} totalSteps={totalSteps} showFooter={false}>
        <LoadingScreen
          title="Loading your postcard templates..."
          subtitle="Setting up professional PSD templates with full editing capabilities..."
        />
      </ProcessLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ProcessLayout currentStep={2} totalSteps={totalSteps} showFooter={false}>
        <div className="step2-error-state">
          <div className="error-icon">⚠️</div>
          <h2>Unable to load templates</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh Page
            </button>
            <button onClick={handleBack} className="btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </ProcessLayout>
    );
  }

  return (
    <ProcessLayout
      currentStep={2}
      totalSteps={totalSteps}
      footerMessage={
        selectedTemplate
          ? `Continue with ${selectedTemplate.name} template`
          : "Please select a template before continuing to the editor"
      }
      onContinue={handleContinue}
      continueDisabled={!selectedTemplate}
      onSkip={() => navigate('/dashboard')}
      skipText="Cancel"
    >
      <div className="step2-main-content">
        <motion.button
          className="step2-back-button"
          onClick={handleBack}
          whileHover={{ scale: 1.02, x: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <ChevronLeft size={18} />
          Back
        </motion.button>

        <h1 className="step2-title">Pick a Postcard Template</h1>
        <p className="step2-subtitle">
          Choose from {templates.length} professional PSD templates with real preview images and full editing capabilities
        </p>

        {/* Brand Colors Indicator */}
        {businessData.colors && businessData.colors.palette && businessData.colors.palette.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: '#F7FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4A5568' }}>
              🎨 Your Brand Colors:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {businessData.colors.palette.slice(0, 4).map((color, index) => (
                <div
                  key={index}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: color.hex || color,
                    borderRadius: '6px',
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}
                  title={color.hex || color}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#718096', marginLeft: 'auto' }}>
              These will be applied to your template
            </span>
          </motion.div>
        )}

        <p className="step2-preview-label">Preview of selected Template</p>

        {/* Preview Container */}
        <div className="step2-preview-container">
          {selectedTemplate ? (
            <>
              {/* Navigation Arrows */}
              <button
                className="step2-nav-arrow prev"
                onClick={prevPreview}
                disabled={currentPreviewIndex === 0}
                aria-label="Previous template"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="step2-preview-wrapper">
                <div className="step2-preview-bg">
                  <img
                    src={getTemplatePreviewUrl(selectedTemplate)}
                    alt={`${selectedTemplate.name} template preview`}
                    onError={(e) => {
                      console.warn(`Failed to load preview image for ${selectedTemplate.name}:`, e.target.src);
                      e.target.src = `data:image/svg+xml,${encodeURIComponent(`
                        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                          <rect width="100%" height="100%" fill="${selectedTemplate.primaryColor || '#f7fafc'}"/>
                          <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white">
                            ${selectedTemplate.name}
                          </text>
                          <text x="50%" y="65%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#ffffff80">
                            Image Not Available
                          </text>
                        </svg>
                      `)}`;
                    }}
                  />
                </div>

                {/* Template info overlay */}
                <div className="step2-template-info-overlay">
                  <div className="template-name">{selectedTemplate.name}</div>
                  <div className="template-features">
                    {selectedTemplate.features && selectedTemplate.features.slice(0, 3).map((feature, index) => (
                      <span key={index} className="feature-badge">{feature}</span>
                    ))}
                  </div>
                </div>

              </div>

              <button
                className="step2-nav-arrow next"
                onClick={nextPreview}
                disabled={currentPreviewIndex === templates.length - 1}
                aria-label="Next template"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          ) : (
            <div className="step2-empty-preview">
              <h3>Select a template to see preview</h3>
              <p>Click <strong>Select</strong> on any template below to see how your postcard will look</p>
            </div>
          )}
        </div>

        {/* Product Details Toggle */}
        <div className="step2-product-details">
          <button
            className="step2-details-toggle"
            onClick={() => setShowProductDetails(!showProductDetails)}
          >
            <span>Product Details</span>
            <svg
              className={`step2-chevron ${showProductDetails ? 'up' : ''}`}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showProductDetails && (
            <div className="step2-details-content">
              <ul>
                <li>Dimension: 5.3" x 7.5" (Professional Postcard Size)</li>
                <li>Format: High-resolution PSD templates with editable elements</li>
                <li>Editing: Advanced IMG.LY editor with Simple and Professional modes</li>
                <li>Export: PDF and PNG formats available</li>
                <li>Elements: Text, images, colors, and layout fully customizable</li>
              </ul>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="step2-templates-grid">
          {isLoading ? (
            Array.from({ length: templatesPerPage }).map((_, index) => (
              <TemplateCardSkeleton key={`skeleton-${index}`} />
            ))
          ) : (
            getCurrentPageTemplates().map((template) => (
              <motion.div
                key={template.id}
                className={`step2-template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
                whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(0, 0, 0, 0.12)" }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <img
                  src={getTemplatePreviewUrl(template)}
                  alt={template.name}
                  className="step2-template-image"
                  onError={(e) => {
                    console.warn(`Failed to load template image for ${template.name}:`, e.target.src);
                    e.target.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="${template.primaryColor || '#f7fafc'}"/>
                        <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="white">
                          ${template.name}
                        </text>
                      </svg>
                    `)}`;
                  }}
                />
                <div className="step2-template-info">
                  <h3 className="step2-template-name">{template.name}</h3>
                  <button className="step2-template-button">
                    {selectedTemplate?.id === template.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="step2-pagination">
            <button
              className="step2-pagination-button"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="step2-page-numbers">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  className={`step2-page-number ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              className="step2-pagination-button"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="step2-modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="step2-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="step2-modal-close"
              onClick={() => setShowLeaveModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3>Do you wanna leave this page?</h3>
            <p>If you go back now, you can save your progress as a draft or delete all changes you've made.</p>
            <div className="step2-modal-actions">
              <button
                className="step2-modal-button delete"
                onClick={() => {
                  setShowLeaveModal(false);
                  navigate('/campaign/step1');
                }}
              >
                Delete All Changes
              </button>
              <button
                className="step2-modal-button save"
                onClick={() => {
                  localStorage.setItem('campaignDraft', JSON.stringify({
                    step: 2,
                    selectedTemplate: selectedTemplate,
                    businessData: businessData,
                    savedAt: new Date().toISOString()
                  }));
                  setShowLeaveModal(false);
                  navigate('/dashboard');
                }}
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .step2-error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 300px);
          text-align: center;
          padding: 40px;
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

        .error-icon {
          font-size: 48px;
          margin-bottom: 20px;
          opacity: 0.8;
        }

        .step2-error-state h2 {
          color: #e53e3e;
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .step2-error-state p {
          color: #718096;
          margin: 0 0 30px 0;
          max-width: 500px;
          font-size: 14px;
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: 15px;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background-color: #20B2AA;
          color: white;
        }

        .btn-primary:hover {
          background-color: #17a097;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(32, 178, 170, 0.3);
        }

        .btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(32, 178, 170, 0.2);
        }

        .btn-secondary {
          background-color: #f7fafc;
          color: #4a5568;
          border: 1.5px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background-color: #edf2f7;
          border-color: #cbd5e0;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:active {
          transform: translateY(0);
          box-shadow: none;
        }

        .step2-subtitle {
          color: #718096;
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.6;
        }

        .step2-template-info-overlay {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
        }

        .template-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .template-features {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .feature-badge {
          background: rgba(255,255,255,0.2);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
        }

        .step2-template-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
          color: #718096;
        }

        .quality-badge {
          background: #20B2AA;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
        }
      `}</style>
    </ProcessLayout>
  );
};

export default CampaignStep2;
