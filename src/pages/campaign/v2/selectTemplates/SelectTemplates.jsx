import React, { useEffect, useState } from 'react';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import PreviewCards from '../../../../components/campaign/PreviewCards';
import {useBrandDev} from '../../../../contexts/BrandDevContext.jsx'
import { Layout, Wand2, Check } from "lucide-react";
import { supabase } from '../../../../supabase/integration/client';
import "./selectTemplate.css";

const SelectTemplates = () => {
    /* templates */
    const totalSteps = 5;
    const categoryLabel = "IT SECTOR";
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [ selectedTemplate, setIsSelectedTemplate ] = useState({});

    useEffect(() => {
      getTemplates();
    }, []);


    // brand.dev data
    const { mappedData: brand, apiResponse } = useBrandDev();

    /* Get templates from the supabase */
    const getTemplates = async () => {
      try {
        const { data, error } = await supabase
        .from("master_campaign")
        .select("*");
        
        const htmlBody = dynamicTemplate(data[0]);
        // data[0].html = htmlBody
        setTemplates(data);       
      } catch (error) {
        console.error(error?.stack)
      };
    };

    /*  */
    const dynamicTemplate = (template) => {
      try {
        const DynamicTemplates = template?.html
          .replace(/{{companyName}}/g, "title")
          .replace(/{{website}}/g, "domain")
          .replace(/{{contact_detail}}/g, "description");

        return DynamicTemplates;
      } catch (error) {
        console.error(error);
      };
    };

    const handleTemplateSelect = async (template) => {
      try {
        if(!template) return null;

        /* I am passing this function as a props to the preview template component so i will get the templateId */
        setSelectedTemplateId(template);

        /* get the template details such as html and the metadata */
        const selectedTemplate = templates.find(template => template.template_id === selectedTemplateId);

        /* store everything in a state */
        setIsSelectedTemplate(selectedTemplate);

        /* the below code will come under the continue button for the sake of testing i am doing here  */
        /* here i am fetching the brand.dev details such as company name, logo, and font-family, colors */
        // const { socialLinks, slogan, name, logo, email, description } = brand;

        /* Here going to call the clone API */
        await userCampaign();
      } catch (error) {
        console.error(error);
      };
    };

    const userCampaign = async () => {
      try {
        const userTemplate = templates.find(template => template.template_id == selectedTemplateId);

        /* userCampaign */
        const { html, meta_data, template_id } = userTemplate;        
        
        /* taking the deep copy */
        const clonedEditorData = JSON.parse(meta_data);
        
        /* here i am updating the value */
        console.log(clonedEditorData?.editorData?.pages?.[0]?.children);
      } catch (error) {
        console.error(error);
      };
    };

    return (
        <React.Fragment>
            <main>
                {/* Header And Footer Layout */}
                <ProcessLayout currentStep={2} totalSteps={totalSteps}
                    // footerMessage={selectedTemplate
                    //     ? `Continue with ${selectedTemplate.name} template`
                    //     : "Please select a template before continuing to the editor"}
                    // onContinue={handleContinue}
                    // continueDisabled={!selectedTemplate}
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
                                AI-curated designs for <span className="font-semibold text-[#4928ed]">{categoryLabel}</span> based on your brand
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
                            {1} designs curated for {categoryLabel}
                          </h2>
                          <p className="text-sm text-[#b5b0c3]">
                            Matching your brand colors and {categoryLabel.toLowerCase()} category
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
                </ProcessLayout>  
            </main>
        </React.Fragment>
    );
};

export default SelectTemplates;
