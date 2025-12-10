import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, Palette, Zap } from 'lucide-react';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import { FormInput, FormSelect } from '../../../../components/ui';
import brandfetchService from '../../../../supabase/api/brandFetchService';
import supabaseCompanyService from '../../../../supabase/api/companyService';
import campaignService from '../../../../supabase/api/campaignService';
import toast from 'react-hot-toast';
// import '../../../pages/onboarding/onboarding-step2-redesign.css';

const CampaignStep1 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    website: '',
    businessCategory: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBrand, setIsFetchingBrand] = useState(false);
  const [brandPreview, setBrandPreview] = useState(null);

  const totalSteps = 5;

  const businessCategories = [
    'Restaurant & Food Service',
    'Retail & E-commerce',
    'Real Estate',
    'Home Services',
    'Health & Wellness',
    'Professional Services',
    'Automotive',
    'Education',
    'Entertainment & Events',
    'Non-Profit',
    'Other'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const isFormValid = () => {
    return formData.website && formData.businessCategory && isValidURL(formData.website);
  };

  const isValidURL = (url) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleContinue = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setIsFetchingBrand(true);

    try {
      // Fetch brand information
      toast.loading('Fetching your brand information...', { id: 'brand-fetch' });

      let brandData = null;
      try {
        brandData = await brandfetchService.fetchBrandInfo(formData.website);
        toast.success('Brand information retrieved!', { id: 'brand-fetch' });

        if (brandData) {
          setBrandPreview({
            name: brandData.name,
            logo: brandData.logo?.primary || brandData.logo?.icon,
            colors: brandData.colors
          });
        }
      } catch (brandError) {
        console.warn('Brandfetch error:', brandError);
        toast.dismiss('brand-fetch');
        toast.error('Could not fetch brand info, but you can continue with manual setup');
      }

      setIsFetchingBrand(false);

      // Save brand data to Supabase if successfully fetched
      if (brandData) {
        try {
          toast.loading('Saving brand information...', { id: 'save-brand' });

          const companyDataToSave = {
            name: brandData.name || 'Your Business',
            website: formData.website,
            domain: brandData.domain || formData.website,
            businessCategory: formData.businessCategory,
            description: brandData.description || null,
            industry: brandData.industry || formData.businessCategory,

            // Brand information
            logo: {
              primary: brandData.logo?.primary || null,
              icon: brandData.logo?.icon || null
            },
            colors: {
              primary: brandData.colors?.primary || null,
              secondary: brandData.colors?.secondary || null,
              palette: brandData.colors?.palette || []
            },

            // Fonts
            fonts: brandData.fonts || null,

            // Social links
            socialLinks: brandData.socialLinks || null,

            // Additional info
            companyInfo: {
              founded: brandData.companyInfo?.founded || null,
              employees: brandData.companyInfo?.employees || null,
              location: brandData.companyInfo?.location || null
            },

            // Store raw brandfetch data for reference
            rawData: brandData
          };

          const companyResult = await supabaseCompanyService.saveCompanyInfo(companyDataToSave);
          toast.success('Brand information saved!', { id: 'save-brand' });

          // Create draft campaign immediately after company save
          toast.loading('Creating campaign...', { id: 'create-campaign' });

          const draftCampaign = await campaignService.createCampaign({
            campaign_name: `${brandData.name || 'Business'} Campaign`,
            company_id: companyResult.company.id,
            status: 'draft',
            payment_status: 'pending',
            template_id: null,
            template_name: null,
            postcard_design_url: null,
            postcard_preview_url: null
          });

          if (!draftCampaign || !draftCampaign.success || !draftCampaign.campaign || !draftCampaign.campaign.id) {
            throw new Error('Failed to create campaign. Please try again.');
          }

          toast.success('Campaign created!', { id: 'create-campaign' });

          // Store campaign data with campaign ID in localStorage
          const campaignData = {
            website: formData.website,
            businessCategory: formData.businessCategory,
            brandData: brandData,
            companyId: companyResult.company.id,
            campaignId: draftCampaign.campaign.id
          };

          localStorage.setItem('newCampaignData', JSON.stringify(campaignData));
          localStorage.setItem('currentCampaignStep', '2');

        } catch (saveError) {
          console.warn('Failed to save brand info or create campaign:', saveError);
          toast.error('Failed to save data. Please try again.', { id: 'save-brand' });
          return; // Don't proceed if save failed
        }
      } else {
        // No brand data, store minimal campaign data
        const campaignData = {
          website: formData.website,
          businessCategory: formData.businessCategory,
          brandData: null
        };

        localStorage.setItem('newCampaignData', JSON.stringify(campaignData));
        localStorage.setItem('currentCampaignStep', '2');
      }

      // Navigate to next step
      setTimeout(() => {
        navigate('/campaign/step2');
      }, 500);

    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProcessLayout
      currentStep={1}
      totalSteps={totalSteps}
      footerMessage="Enter your website URL and select your business category to continue"
      onContinue={handleContinue}
      continueDisabled={!isFormValid() || isLoading}
      continueText={isLoading ? 'Processing...' : 'Continue'}
      onSkip={() => navigate('/dashboard')}
      skipText="Cancel"
    >
      <motion.button
        className="process-back-button"
        onClick={handleBack}
        disabled={isLoading}
        whileHover={{ scale: 1.02, x: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <ChevronLeft size={18} />
        Back to Dashboard
      </motion.button>

        <main className="animate-slide-up max-w-4xl mx-auto">
            {/* Hero Section */}
            <section className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                    <Zap className="w-4 h-4" />
                    Step 1 of 4 • Brand Setup
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
                    Let's identify your brand
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Enter your website URL and our AI will automatically fetch all your business information
                </p>
            </section>
        </main>
        <form className="onboarding-form" onSubmit={handleContinue}>
          <FormInput
            label="Business Website"
            type="url"
            id="website"
            name="website"
            placeholder="https://yourcompany.com"
            value={formData.website}
            onChange={handleChange}
            required
            disabled={isLoading}
            error={formData.website && !isValidURL(formData.website) ? 'Please enter a valid URL' : ''}
            helper="We'll use this to fetch your brand colors and logo"
          />

          <FormSelect
            label="Business Category"
            id="businessCategory"
            name="businessCategory"
            value={formData.businessCategory}
            onChange={handleChange}
            required
            disabled={isLoading}
            placeholder="Please select a category"
            options={businessCategories.map(cat => ({ value: cat, label: cat }))}
            helper="This helps us recommend appropriate templates"
          />
        </form>

        {brandPreview && (
          <motion.div
            className="brand-preview-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: '#F7FAFC',
              borderRadius: '12px',
              border: '2px solid #20B2AA'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#20B2AA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Check size={28} strokeWidth={3} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1A202C' }}>
                  Brand Found: {brandPreview.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#718096' }}>
                  Your brand identity has been retrieved successfully
                </p>
              </div>
            </div>

            {brandPreview.logo && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img
                  src={brandPreview.logo}
                  alt={`${brandPreview.name} logo`}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '80px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            )}

            {brandPreview.colors && brandPreview.colors.palette && brandPreview.colors.palette.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: '600', color: '#4A5568', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Palette size={16} /> Brand Colors:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {brandPreview.colors.palette.slice(0, 6).map((color, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: color.hex || color,
                          borderRadius: '8px',
                          border: '2px solid #E2E8F0',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title={color.hex || color}
                      />
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#718096',
                        fontFamily: 'monospace'
                      }}>
                        {(color.hex || color).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#E6FFFA',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#234E52'
            }}>
              <strong>Next:</strong> These colors will be automatically applied to your postcard template!
            </div>
          </motion.div>
        )}
    </ProcessLayout>
  );
};

export default CampaignStep1;
