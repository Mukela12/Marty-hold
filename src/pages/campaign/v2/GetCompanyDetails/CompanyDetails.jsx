import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import { motion } from 'framer-motion';
import { FormInput } from '../../../../components/ui';
import { ChevronLeft, Check, Palette, Zap, Sparkles, Loader2,Globe,Mail,Building2,Phone,MapPin, ExternalLink,Edit2,X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import "./companyDetails.css"
import { useForm } from 'react-hook-form';
import {businessCategories} from './GetCompanyUtils.js';
import { useBrandDev } from '../../../../contexts/BrandDevContext.jsx';
import campaignService from '../../../../supabase/api/campaignService.js';

const CampaignStep1 = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    website: '',
    businessCategory: ''
  });
  
  const {
    mappedData: brand,        
    fetchSuccess,  
    isEditing,                   
    fetchBrandData,              
    saveBrandData,               
    toggleEditMode,        
    companyDomain,
    setCompanyDomainDetails ,
    clearBrandData       
  } = useBrandDev();


  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm({
    defaultValues: {
      businessName: '',
      category: '',
      website: '',
      address: '',
      phone: '',
      email: '',
      brandColor: '#6366F1'
    }
  });

  const formValues = watch();
  const watchedBrandColor = watch('brandColor');
  const totalSteps = 5;
  
  const [isLoading, setIsLoading] = useState(false);
  const [localIsFetching, setLocalIsFetching] = useState(false);

  useEffect(() => {
    if (brand) {
      reset({
        businessName: brand.name || '',
        category: brand.category || '',
        website: formData.website || brand.website || '',
        address: brand.address || '',
        phone: brand.phone || '',
        email: brand.email || '',
        brandColor: brand.colors?.primary || '#6366F1'
      });
    }
  }, [brand, formData.website, reset]);


  const handleFetchBrand = async () => {
    if (!formData.website || !isValidURL(formData.website)) {
      toast.error('Please enter a valid website URL');
      return;
    }

    setLocalIsFetching(true);
    setCompanyDomainDetails(formData.website);

    try {
      toast.loading('Detecting brand information...', { id: 'brand-detect' });
      const result = await fetchBrandData(formData.website);
      
      if (result.success) {
        toast.success('Brand information detected successfully!', { id: 'brand-detect' });
      }
    } catch (error) {
      toast.error('Failed to detect brand. Please try again.', { id: 'brand-detect' });
    } finally {
      setLocalIsFetching(false);
    }
  };


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBack = () => {
    clearBrandData()
    navigate('/dashboard');
  };

  const isFormValid = () => {
    return formData.website && isValidURL(formData.website) && brand;
  };

  const isValidURL = (url) => {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  async function handleContinue(e) {
    try {
      e.preventDefault();
      const currentFormValues = getValues();
      
      const updatedBrand = {
        ...brand,
        name: currentFormValues.businessName,
        category: currentFormValues.category,
        website: currentFormValues.website,
        address: currentFormValues.address,
        phone: currentFormValues.phone,
        email: currentFormValues.email,
        colors: {
          ...brand?.colors,
          primary: currentFormValues.brandColor
        }
      };
      saveBrandData(updatedBrand, currentFormValues);
      
      /* creating the campaign */
      const draftCampaign = await campaignService.createCampaign({
        campaign_name: `${currentFormValues.businessName || 'Business'} Campaign`,
        company_id: brand?.companyId,
        status: 'draft',
        payment_status: 'pending',
        template_id: null,
        template_name: null,
        postcard_design_url: null,
        postcard_preview_url: null
      });
      
      if (!draftCampaign || !draftCampaign.success || !draftCampaign.campaign || !draftCampaign.campaign.id) {
        throw new Error('Failed to create campaign. Please try again.');
      };
      toast.success('Campaign created!', { id: 'create-campaign' });

      const campaignData = {
        website: currentFormValues.website,
        businessCategory: currentFormValues.category,
        brandData: brand,
        companyId: brand?.companyId,
        campaignId: draftCampaign.campaign.id
      };

      localStorage.setItem('newCampaignData', JSON.stringify(campaignData));
      localStorage.setItem('currentCampaignStep', '2');

      // Navigate to next step
      navigate('/campaign/step2');
    } catch (error) {
      console.error("Error:", error);
      toast.error('An error occurred');
    }
  }

  
const handleCancelEdit = () => {
  if (brand) {
    reset({
      businessName: brand.name || '',
      category: brand.category || '',
      website: formData.website || brand.website || '',
      address: brand.address || '',
      phone: brand.phone || '',
      email: brand.email || '',
      brandColor: brand.colors?.primary || '#6366F1'
    });
  }
  toggleEditMode();
};

const onSubmit = (data) => {
  const updatedBrand = {
    ...brand,
    name: data.businessName,
    category: data.category,
    website: data.website,
    address: data.address,
    phone: data.phone,
    email: data.email,
    colors: {
      ...brand?.colors,
      primary: data.brandColor
    }
  };
  
  saveBrandData(updatedBrand, data);
  
  setFormData(prev => ({ ...prev, website: data.website }));
};


const handleToggleEdit = (e) => {
  e.preventDefault();
  toggleEditMode(); 
};
  
  

  return (
    <ProcessLayout
      currentStep={1}
      totalSteps={totalSteps}
      footerMessage="Enter your website URL"
      onContinue={handleContinue}
      continueDisabled={!isFormValid() || localIsFetching}
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
      <main>
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-5 py-5s rounded-full p-2 bg-[#3b82f610] text-[#3b82f6] text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Step 1 of 4 • Brand Setup
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 mt-2 tracking-tight m-4">
            Let's identify your brand
          </h1>
          <div className='flex justify-center'>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Enter your website URL and our AI will automatically fetch all your business information
            </p>
          </div>
        </section>
        <section className='m-8'>
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#cfc8f7] card-gradient p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center badge-text gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-foreground">AI Brand Detection</h3>
                </div>
                <p className="text-muted-foreground">We'll automatically extract all your business info from your website</p>
              </div>
              <div>
              </div>
            </div>
            {/* <form className="m-4 w-full flex gap-2" onSubmit={brandDetect}>
              <FormInput
                type="url"
                id="website"
                name="website"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={handleChange}
                required
                disabled={isLoading}
                className='w-full'
                error={formData.website && !isValidURL(formData.website) ? 'Please enter a valid URL' : ''}
              />
              <button className='btn text-white bg-[#bf92f0]' type='submit'>
                Detect Brand
              </button>
            </form> */}
            {/* <div className="m-4 w-full flex gap-2">
              <FormInput
                type="url"
                id="website"
                name="website"
                placeholder="https://yourcompany.com"
                value={formData.website}
                onChange={handleChange}
                required
                disabled={localIsFetching || fetchSuccess}
                className='w-full'
                error={formData.website && !isValidURL(formData.website) ? 'Please enter a valid URL' : ''}
              />
              <button
                onClick={handleFetchBrand}
                disabled={!formData.website || isFetching}
                className={`btn text-white flex items-center justify-center min-w-[180px] ${
                  fetchSuccess 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-[#bf92f0]"
                } disabled:opacity-50 disabled:cursor-not-allowed h-14 px-8 rounded-xl text-base font-bold gap-3`}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Detecting...
                  </>
                ) : fetchSuccess ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Brand Found!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Detect Brand
                  </>
                )}
              </button>
            </div> */}
            <div className="m-4 w-full flex gap-2">
              <FormInput
                type="url"
                id="website"
                name="website"
                placeholder="https://yourcompany.com"
                value={formData.website||companyDomain}
                onChange={handleChange}
                required
                disabled={localIsFetching || fetchSuccess}
                className='w-full'
                error={formData.website && !isValidURL(formData.website) ? 'Please enter a valid URL' : ''}
              />
              <button
                onClick={handleFetchBrand}
                disabled={!formData.website || localIsFetching}
                className={`btn text-white flex items-center justify-center h-[2.5rem] min-w-[180px] ${
                  fetchSuccess 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-[#bf92f0]"
                } disabled:opacity-50 disabled:cursor-not-allowed h-14 px-8 rounded-xl text-base font-bold gap-3`}
              >
                {localIsFetching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Detecting...
                  </>
                ) : fetchSuccess ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Brand Found!
                  </>
                ) : (
                  <>
                    <Sparkles className="text-7xl" />
                    Detect Brand
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              {['Logo', 'Brand Colors', 'Business Name', 'Category', 'Phone', 'Address', 'Email'].map((item) => (
                <div key={item} className="flex items-center gap-2 badge-text text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-[#9f8ff2]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
        {/* {brandPreview && (
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
        )} */}

      {fetchSuccess && brand && (
        <motion.div
          className="animate-scale-in space-y-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Brand Preview Card - Wrap in form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#cfc8f7] bg-linear-to-br from-white to-[#faf9ff] p-8 card-shadow">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                <div className="flex gap-2">
                  {isEditing && (
                    <button 
                      type="button"
                      style={{ padding: "5px 19px" }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#ef4444] border border-[#fecaca] hover:bg-[#fef2f2] transition-colors"
                      onClick={handleCancelEdit}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                  {isEditing ? (
                    <button 
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white border border-[#6366F1] hover:bg-[#4f46e5] transition-colors"
                      style={{ padding: "5px 19px" }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </button>
                  ) : (
                    <button
                    type="button"
                    style={{ padding: "6px 20px" }}
                    onClick={handleToggleEdit}
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full
                      bg-linear-to-r from-[#1e3a8a] to-[#1d4ed8]
                      text-xs font-semibold text-white
                      shadow-md shadow-blue-900/30
                      transition-all duration-300 ease-out
                      hover:from-[#1e40af] hover:to-[#2563eb]
                      hover:shadow-lg hover:shadow-blue-900/40
                      hover:-translate-y-px
                      active:translate-y-0
                      active:shadow-md
                      focus:outline-none
                      focus:ring-2 focus:ring-blue-500/50
                    "
                  >
                    <Edit2 className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />
                    Edit
                  </button>                  
                  )}
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-foreground text-[#1f2937]">Your Brand</h4>
              
              {/* Brand Visual Preview */}
              <div 
              style={{ margin: "20px 0" }}
              className="flex items-center gap-6 mb-5 mt-2.5 p-6 rounded-2xl bg-linear-to-br from-[#f0eeff] to-white border border-[#e5e7eb]">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg shrink-0"
                  style={{ backgroundColor: isEditing ? watchedBrandColor : (brand?.colors?.primary || '#6366F1') }}
                >
                  {(isEditing ? watch('businessName') : brand?.name || '').charAt(0).toUpperCase() || 'B'}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <>
                      <input 
                        {...register('businessName', { 
                          required: 'Business name is required',
                          minLength: { value: 2, message: 'Business name must be at least 2 characters' }
                        })}
                        type="text"
                        className="w-full text-2xl font-bold text-[#1f2937] mb-1 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                      />
                      {errors.businessName && (
                        <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>
                      )}
                    </>
                  ) : (
                    <h3 className="font-bold text-2xl text-[#1f2937] mb-1">
                      {brand?.name || 'Your Business'}
                    </h3>
                  )}
                  <p className="text-[#6b7280]">
                    {isEditing ? watch('category') || 'Category' : brand?.category || 'Coffee Shop'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div 
                    className="w-10 h-10 rounded-xl border-2 border-white shadow-sm"
                    style={{ backgroundColor: isEditing ? watchedBrandColor : (brand?.colors?.primary || '#6366F1') }}
                    title="Primary Color"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl border-2 border-[#e5e7eb] shadow-sm"
                    style={{ backgroundColor: brand?.colors?.secondary || '#F1F5F9' }}
                    title="Secondary Color"
                  />
                </div>
              </div>

              {/* Detected Info Grid with react-hook-form */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Business Name */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Edit2 className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Business Name</p>
                    {isEditing ? (
                      <>
                        <input 
                          {...register('businessName', { 
                            required: 'Business name is required',
                            minLength: { value: 2, message: 'Business name must be at least 2 characters' }
                          })}
                          type="text"
                          className="w-full h-8 px-2 text-sm rounded-md border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                        {errors.businessName && (
                          <p className="text-xs text-red-500 mt-1">{errors.businessName.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        {brand?.name || '—'}
                      </p>
                    )}
                  </div>
                  {!isEditing && brand?.name && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>

                {/* Category */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Category</p>
                    {/* {isEditing ? (
                      <>
                        <select
                          {...register('category', { required: 'Category is required' })}
                          className="w-full h-8 px-2 text-sm rounded-md border border-[#d1d5db] bg-white focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        >
                          <option value="">Select your category</option>
                          {businessCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        {errors.category && (
                          <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>
                        )}
                      </>
                    ) : ( */}
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        {brand?.category || '—'}
                      </p>
                    {/* // )} */}
                  </div>
                  {!isEditing && brand?.category && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>


                {/* Website */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Website</p>
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        <a href={brand?.website} target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline inline-flex items-center gap-1">
                          {brand?.website || '—'} {brand?.website && <ExternalLink className="w-3 h-3" />}
                        </a>
                      </p>
                  </div>
                  {!isEditing && brand?.website && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>

                {/* Address */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Address</p>
                    {isEditing ? (
                      <>
                        <input 
                          {...register('address')}
                          type="text"
                          className="w-full h-8 px-2 text-sm rounded-md border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                      </>
                    ) : (
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        {brand?.address || '—'}
                      </p>
                    )}
                  </div>
                  {!isEditing && brand?.address && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>

                {/* Phone */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Phone</p>
                    {isEditing ? (
                      <>
                        <input 
                          {...register('phone', {
                            pattern: {
                              value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
                              message: 'Please enter a valid phone number'
                            }
                          })}
                          type="tel"
                          className="w-full h-8 px-2 text-sm rounded-md border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        {brand?.phone || '—'}
                      </p>
                    )}
                  </div>
                  {!isEditing && brand?.phone && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>

                {/* Email */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Email</p>
                    {isEditing ? (
                      <>
                        <input 
                          {...register('email', {
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Please enter a valid email address'
                            }
                          })}
                          type="email"
                          className="w-full h-8 px-2 text-sm rounded-md border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                        />
                        {errors.email && (
                          <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm font-medium text-[#1f2937] truncate">
                        {brand?.email || '—'}
                      </p>
                    )}
                  </div>
                  {!isEditing && brand?.email && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>

                {/* Brand Colors */}
                <div 
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isEditing ? "bg-[#f0eeff] border-2 border-dashed border-[#cfc8f7]" : "bg-[#f9fafb] border border-[#e5e7eb]"}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                    <Palette className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6b7280] font-medium mb-0.5">Brand Colors</p>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            {...register('brandColor')}
                            type="color"
                            className="w-8 h-8 rounded cursor-pointer border border-[#d1d5db]"
                          />
                          <span className="text-sm font-mono text-[#1f2937]">
                            {watchedBrandColor || '#6366F1'}
                          </span>
                        </>
                      ) : (
                        <>
                          <div 
                            className="w-6 h-6 rounded-md border border-[#e5e7eb]"
                            style={{ backgroundColor: brand?.colors?.primary || '#6366F1' }}
                          />
                          <span className="text-sm font-mono text-[#1f2937]">
                            {brand?.colors?.primary || '#6366F1'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!isEditing && brand?.colors?.primary && (
                    <Check className="w-4 h-4 text-[#29ba8c] shrink-0" />
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Info Banner with Sparkles icon - Fixed spacing */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#6366F1]/5 border border-[#6366F1]/20s" style={{ marginTop: "20px" }}>
            <Sparkles className="w-5 h-5 text-[#6366F1] shrink-0" />
            <p className="text-sm text-[#6b7280]">
              <span className="font-semibold text-[#1f2937]">All information auto-detected!</span> Click Edit above if you need to make any adjustments before continuing.
            </p>
          </div>
        </motion.div>
      )}
    </ProcessLayout>
  );
};

export default CampaignStep1;
