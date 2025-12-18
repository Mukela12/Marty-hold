import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import PreviewCards from '../../../../components/campaign/PreviewCards';
import {useBrandDev} from '../../../../contexts/BrandDevContext.jsx'
import { Layout, Wand2, Check } from "lucide-react";
import { supabase } from '../../../../supabase/integration/client';
import campaignService from '../../../../supabase/api/campaignService.js';
import "./selectTemplate.css";
import toast from 'react-hot-toast';

const SelectTemplates = () => {
  const navigate = useNavigate();

    /* templates */
    const totalSteps = 5;
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [ selectedTemplate, setIsSelectedTemplate ] = useState({});

    // brand.dev data
    const { mappedData: brand, apiResponse } = useBrandDev();    

    useEffect(() => {
      getTemplates();
    }, []);

    /* Get templates from the supabase */
    const getTemplates = async () => {
      try {
        const { data, error } = await supabase
        .from("master_campaign")
        .select("*");
        
        /* brand.dev */
        if(data.length) {
          const UpdatedTemplates = data.map((template) => {
            /* postgrid templates */
            return dynamicTemplate(template);
          });
          setTemplates(UpdatedTemplates);
        };
      } catch (error) {
        console.error(error?.stack)
      };
    };

    /* Dynamic Templates */
    const dynamicTemplate = (template) => {
      try {
        // Handling the null values
        if (!template || !template.meta_data || !brand) return template;

        // Brand.dev Data's
        const { name, website, phone, colors } = brand;        
        console.log(template.html);
        
        /* PostGrid HTML */
        const textColor =
          colors?.primary ||
          colors?.secondary ||
          colors?.palette?.[0]?.hex ||
          "#000000";
          
          const DynamicTemplates = template?.html
          .replace(/{{companyName}}/g, name)
          .replace(/{{website}}/g, website)
          .replace(/{{contact_detail}}/g, phone)
          .replace(/{{discount}}/g, "50")
          .replace('</head>', `<style>* { color: ${textColor} !important; }</style></head>`);
          
        /* POSTGRID METADATA */
        const postgridMetaData = typeof template.meta_data == "string" ? JSON.parse(template.meta_data) : template.meta_data;
        
        // updated metadata
        const updatedMeta = {
          ...postgridMetaData,
          editorData: {
            ...postgridMetaData.editorData,
            pages: postgridMetaData.editorData.pages.map(page => ({
              ...page,
              children: page.children.map(child => ({
                ...child,
                text: postgridTextReplace(child.text, brand)
              }))
            }))
          }
        };

        return {
          ...template,
          html: DynamicTemplates,
          meta_data: JSON.stringify(updatedMeta)
        };
      } catch (error) {
        console.error(error);
      };
    };

    /* replaceHelperMethod util */
    const postgridTextReplace = (text, brandData) => {
      if (!text) return text;

      const { name, website, phone } = brandData;
      return text
        .replace(/{{companyName}}/g, name)
        .replace(/{{website}}/g, website)
        .replace(/{{contact_detail}}/g, phone)
        .replace(/{{discount}}/g, "50");
    };

    const handleTemplateSelect = async (templateid) => {
      try {
        if(!templateid) return null;

        /* I am passing this function as a props to the preview template component so i will get the templateId */
        setSelectedTemplateId(templateid);

        /* get the template details such as html and the metadata */
        const selectedTemplate = templates.find(template => template.template_id === templateid);

        /* store everything in a state */
        setIsSelectedTemplate(selectedTemplate);
      } catch (error) {
        console.error(error);
      };
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
          };
        
          // Update existing campaign with template information
          /* Earlier They Handled Using The Local Storage Now In State */
          const metaData = typeof selectedTemplate.meta_data == "string" ? JSON.parse(selectedTemplate.meta_data): selectedTemplate.meta_data;
          const postgridMetaData = structuredClone(metaData);
          
          const { data, error } = await supabase.functions.invoke("user-campaign", {
            body: {
              name: `Cloned Template - ${campaignId}`,
              html: selectedTemplate.html,
              templateType: "editor",
              editorData: postgridMetaData.editorData,
              editorCollateral: postgridMetaData.editorCollateral,
              editorCollateralDest: postgridMetaData.editorCollateralDest,
              editorPostcardSide: postgridMetaData.editorPostcardSide
            }
          });

          if(!error) {
            const insertUserParams = {
              masterTemplateId: selectedTemplate?.template_id,
              templateId: data?.data?.id,
              companyId: brand?.companyId,
              status: 1
            };

            await campaignService.insertUserTemplate(insertUserParams);
            
            const updateData = {
              template_id: data?.data?.id,
              template_name: data?.[0]?.v
            };
            
            const result = await campaignService.updateCampaign(campaignId, updateData);
            
            if (!result.success) {
              throw new Error('Failed to update campaign with template');
            };
            
            // // Store campaign ID and template data for Step 3
            localStorage.setItem('currentCampaignId', campaignId);
            
            // localStorage.setItem('campaignSelectedTemplate', JSON.stringify(selectedTemplate));
            localStorage.setItem('currentCampaignStep', '3');
            
            toast.success('Template saved!', { id: 'save-template' });
            navigate('/campaign/step3');
            return;
          };
          throw new Error('Failed to update campaign with template');
        } catch (error) {
          console.error('Error updating campaign:', error);
          toast.error('Failed to save template. Please try again.', { id: 'save-template' });
        };
      };
    };

    return (
        <React.Fragment>
            <main>
                {/* Header And Footer Layout */}
                <ProcessLayout currentStep={2} totalSteps={totalSteps}
                    // footerMessage={selectedTemplate
                    //     ? `Continue with ${selectedTemplate.description} template`
                    //     : "Please select a template before continuing to the editor"}
                    onContinue={handleContinue}
                    continueDisabled={!selectedTemplate}
                    onSkip={() => navigate('/dashboard')}
                    skipText="Cancel">
                  
                    {/* Hero Section */}
                    <section className="text-center m-6">
                        <div className="inline-flex items-center gap-2 px-5 py-5 rounded-full p-2 bg-[#ddd5f7] text-[#3b82f6] text-sm font-semibold mb-6">
                            <Layout className="w-4 h-4" />
                            Step 2 of 4 • Template Selection
                        </div>
                        <h1 className="text-4xl md:text-5xl m-6 font-black text-foreground tracking-tight">
                            Choose your postcard design
                        </h1>
                        <div className='flex justify-center'>
                            <p className="text-lg text-[#b5b0c3] max-w-2xl mx-auto">
                                AI-curated designs for <span className="font-semibold text-[#4928ed]">{brand?.category && brand?.category}</span> based on your brand
                            </p>
                        </div>
                    </section>

                    {/* AI Banner */}
                    <div className="p-4 rounded-2xl primary-gradient border border-[#c2b8f5]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
                          <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-foreground">
                            {1} designs curated for {brand?.category && brand?.category}
                          </h2>
                          <p className="text-sm text-[#b5b0c3]">
                            Matching your brand colors and {brand?.category && brand?.category} category
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="grid post-card grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9">
                      {templates.map((template) => (
                        <PreviewCards 
                        key={template.template_id} 
                        handleTemplateSelect={handleTemplateSelect}
                        selectedTemplates={selectedTemplateId == template.template_id} 
                        masterTemplate={template} />
                      ))}
                    </div>

                    {/* After Selection */}
                    {selectedTemplateId && 
                    <div className="p-4 selected after-select rounded-2xl bg-[#e3f2ee] border border-[#c4e8df] animate-scale-in">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#bbe6d9] flex items-center justify-center">
                          <Check className="w-6 h-6 text-[#23b987]" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-foreground">selectedTemplatename</p>
                          <p className="text-sm text-muted-foreground">Click Continue to customize this design with AI</p>
                        </div>
                      </div>
                    </div>
                    }
                </ProcessLayout>  
            </main>
        </React.Fragment>
    );
};

export default SelectTemplates;
