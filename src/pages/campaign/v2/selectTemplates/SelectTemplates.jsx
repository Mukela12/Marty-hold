import React, { useState } from 'react';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import { Layout, Wand2, Check } from "lucide-react";
import "./selectTemplate.css";
import PreviewCards from '../../../../components/campaign/PreviewCards';
import {useBrandDev} from '../../../../contexts/BrandDevContext.jsx'

const SelectTemplates = () => {
    /* templates */
    const [templates, setTemplates] = useState([]);

    const totalSteps = 5;
    const categoryLabel = "IT SECTOR";

    const {
      mappedData: brand,     
      apiResponse,           
    } = useBrandDev();
  
    console.log("mapped data ---->", brand);
    console.log("apiresponse ---->", apiResponse)

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
                        <h1 className="text-4xl md:text-5xl m-6 font-extrabold text-foreground tracking-tight">
                            Choose your postcard design
                        </h1>
                        <div className='flex justify-center'>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                AI-curated designs for <span className="font-semibold text-[#4928ed]">{categoryLabel}</span> based on your brand
                            </p>
                        </div>
                    </section>

                    {/* AI Banner */}
                    <div className="mb-8 p-4 rounded-2xl primary-gradient border border-[#c2b8f5]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
                          <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-foreground">
                            {1} designs curated for {categoryLabel}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Matching your brand colors and {categoryLabel.toLowerCase()} category
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="grid post-card grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9">
                      <PreviewCards />
                      <PreviewCards />
                      <PreviewCards />
                      <PreviewCards />
                      <PreviewCards />
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
