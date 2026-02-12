import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import { Layout, Wand2, Check } from "lucide-react";

const EditTemplate = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaignId, setCampaignId] = useState(null);

  // Editor state (lifted up for ProcessLayout integration)
  const [editorMode, setEditorMode] = useState('simple');
  const [currentPage, setCurrentPage] = useState('front');
  const [isSaving, setIsSaving] = useState(false);
  const [isDoubleSided, setIsDoubleSided] = useState(false);

  const totalSteps = 5;

  // Load selected template and campaign ID from localStorage
  useEffect(() => {
    const loadTemplateData = async () => {
      try {
        setLoading(true);

        // Load campaign ID
        const savedCampaignId = localStorage.getItem('currentCampaignId');
        
        if (!savedCampaignId) {
          setError('No campaign found. Please start from the beginning.');
          return;
        }
        setCampaignId(savedCampaignId);

        // Load the selected template from Step 2
        // const savedTemplate = localStorage.getItem('campaignSelectedTemplate');
        // if (!savedTemplate) {
        //   setError('No template selected. Please go back and select a template.');
        //   return;
        // }

        // const selectedTemplate = JSON.parse(savedTemplate);
        // console.log('Selected template from Campaign Step 2:', selectedTemplate);

        // Validate that we have a proper PSD template
        // if (!selectedTemplate.psdFile) {
        //   throw new Error('Selected template does not have a PSD file. Please select a valid template.');
        // }

        // Ensure the template has the required path structure for the editor
        // const finalTemplate = {
        //   ...selectedTemplate,
        //   psdPath: `/PSD-files/${selectedTemplate.psdFile}`,
        //   preview: selectedTemplate.preview || null
        // };

        // console.log('Template ready for editor:', finalTemplate);
        // console.log('Campaign ID:', savedCampaignId);
        // setSelectedTemplate(finalTemplate);

      } catch (err) {
        console.error('Failed to load template:', err);
        setError(err.message || 'Failed to load template. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadTemplateData();
  }, []);

  const handleBack = () => {
    navigate('/campaign/step2');
  };

  const handleContinue = async () => {
    try {
      setIsSaving(true);
      toast.loading('Saving your design...', { id: 'save-design' });

      // Call FabricEditor's save method via ref
      toast.success('Design saved successfully!', { id: 'save-design' });

      // Store URLs in localStorage for later steps
      // localStorage.setItem('template', saveResult.previewUrl);

      // Navigate to next step
      localStorage.setItem('currentCampaignStep', '4');
      navigate('/campaign/step4');
    } catch (error) {
      console.error('Error saving design before continue:', error);
      toast.error(error.message || 'Failed to save design. Please try again.', { id: 'save-design' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDesign = async (designData) => {
    setIsSaving(true);
    try {
      console.log('Design saved:', designData);
      // Design URLs are already saved to database by FabricEditor
      // Just store them in localStorage for Step 5
      if (designData) {
        localStorage.setItem('campaignDesignUrl', designData.designUrl);
        localStorage.setItem('campaignPreviewUrl', designData.previewUrl);
      }
    } catch (error) {
      console.error('Error saving design:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeChange = (mode) => {
    setEditorMode(mode);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePSDAnalysis = (analysisResult) => {
    if (analysisResult && analysisResult.isDoubleSided !== undefined) {
      console.log('PSD Analysis received:', analysisResult);
      setIsDoubleSided(analysisResult.isDoubleSided);
    }
  };

  if (loading) {
    return (
      <ProcessLayout currentStep={3} totalSteps={totalSteps} showFooter={false}>
        <div className="step3-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Setting up your postcard editor...</h2>
            <p>Loading template and initializing editor components</p>
          </div>
        </div>
      </ProcessLayout>
    );
  }

  if (error) {
    return (
      <ProcessLayout
        currentStep={3}
        totalSteps={totalSteps}
        footerMessage="Please resolve the error to continue"
        onContinue={handleContinue}
        continueDisabled={true}
        onSkip={() => navigate('/dashboard')}
        skipText="Cancel"
      >
        <div className="step3-error">
          <div className="error-icon">⚠️</div>
          <h2>Unable to load editor</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleBack} className="btn-secondary">
              Go Back to Templates
            </button>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh Page
            </button>
          </div>
        </div>
      </ProcessLayout>
    );
  }

  // if (!selectedTemplate) {
  //   return (
  //     <ProcessLayout currentStep={3} totalSteps={totalSteps} showFooter={false}>
  //       <div className="step3-no-template">
  //         <h2>No template selected</h2>
  //         <p>Please go back and select a template to continue.</p>
  //         <button onClick={handleBack} className="btn-primary">
  //           Select Template
  //         </button>
  //       </div>
  //     </ProcessLayout>
  //   );
  // }

  return (
    <ProcessLayout
      currentStep={3}
      totalSteps={totalSteps}
      // footerMessage={isSaving ? "Saving your design..." : "Complete your postcard design and continue to targeting"}
      onContinue={handleContinue}
      continueDisabled={isSaving}
      onSkip={() => navigate('/dashboard')}
      skipText="Cancel"
      // Editor controls integrated into topbar
      editorMode={editorMode}
      onModeChange={handleModeChange}
      isDoubleSided={isDoubleSided}
      currentPage={currentPage}
      onPageChange={handlePageChange}
      onSave={() => handleSaveDesign()}
      isSaving={isSaving}
      templateName={selectedTemplate?.name}
    >
      {/* TODO: Postcard editor integration point — other team will implement */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
        <p>Postcard editor will be integrated here</p>
      </div>
    </ProcessLayout>
  );
};

export default EditTemplate;
