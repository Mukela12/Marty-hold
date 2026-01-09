import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcessLayout from '../../../../components/process/ProcessLayout';
import PreviewCards from '../../../../components/campaign/PreviewCards';
import {useBrandDev} from '../../../../contexts/BrandDevContext.jsx'
import { Layout, Wand2, Check, Loader2 } from "lucide-react";
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
    const [aiResponse, setAiResponse] = useState(null);
    const [loading, setLoading] = useState(true); // Add loading state
    const [aiScores, setAiScores] = useState({}); // Store AI scores

    // brand.dev data
    const { mappedData: brand, apiResponse } = useBrandDev();    

    useEffect(() => {
      initializeTemplates(); 
    }, []);

    const getAigeneraterPostCards = async () => {
      try {
        console.log("brandData---->", apiResponse.brand)
        const { data, error } = await supabase.functions.invoke('ai-postcard-v3', {
          body: { brand:apiResponse.brand,images:["https://imp-ovl.s3.us-east-1.amazonaws.com/Dental-5.png?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjENb%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJHMEUCIQC3PIZz12PW6GaJv%2FPG7AO9GQcatq7pDz6Prk95cuavKAIgTxgaZBOUwQJ08m%2Fr0v4%2FMM3J2Af7nnLTNaJKAqBwKvoqwgMIn%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw5NjM1NjcyNzA0NDIiDC%2FKAT%2FUstdlWYJScSqWA136mu6mxPRgsloBlvvws3lRMhVwwwj8ZhEWk75t6VCyelAxWr9MLn%2BJYysHJP%2B3cC6ktJTxe7cM%2FcApUQ4jJOFekPHO1%2B74JxE9v9KXW6sGsm86JTR39AcWwYxu2OgtzPpyKYOvJcmfpOiTLEMKOFiQDUxZUrZ3F3Jmji6ZMoXGFoN%2BYjlWt7jTrB9aERo0Nwf7m2fs1WjdwUDetchzTpQ3rB%2B%2BF2Vvf0Pp9xAjdar%2Bri430bdRG50E0fLHF1LUKJcKROpHvmi6xrw32i14iw0jkzAvqL9BT%2F3WQtuBt19DdSKsTfPuLuebxSfeJo4CFptPWnSfhlB%2Ft%2FLKz%2BpQb8ZfO%2BHU1TnvrFCt8sTBhdOO278UA5bYK7Wn2xHiuGVw7PR56VmpgcfS9PlXHHHrgKcwBeb%2BZp1Pw5IrPKIyxYdg95U3ehaUCtGOMEoBoS0TbV%2F1pKgUeMW1fCE1m2lcc%2FEvUXrstbmgwk0ZalHUzqZrsVBrwK6lSsD4v28bGEVqelocelbtKBRLEGS6TTqwiDn3cDba6NUwi6uCywY63gLrVuDaLhtZrKM%2F7JBJPdXvfuBSurs2zRk9ZYlVJdNAp6GQn%2F8wYnif%2BJFCNRVEcr8H%2FWklzJYNiM%2FDsKutuyS6%2BTPkwI48JW920C1jcDLn1JRBC88ZfMhWGC3lHkZxnWV6P7fxLIlv6zqd2J%2F5spNXJUAD4toL6aA43PncCsyJ9lHrAtxl3bpnf%2FpfT2EFpyaOeCAtQFTJ3xDuIGAVpn%2B1d54URrkAsIYhaHp6M5vu0YLx%2FoJ0gNXWQjO1mWAIqXcKvK90M6f4XHbUrnaPxxY%2BBktQ5zzmHgg0sgQKYACaIPyWkwz74mRiLV6llQ84W%2FzXG8PfmrM%2FYzZFWTPNO2st7WK2a8365s7dDrbtqGv2h01y9QvghoA%2BDTRIb7lQpolI%2B4iO7y6PbjQ0ZVZSymyy1fkIjEF%2BOeYFCllqPFniNPCNPAGYdm7QDQN0XA8t%2Fw8v2hBY2s5t3U40i2ZJYw%3D%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIA6AWIVXIVKXJKOHMS%2F20260109%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260109T054559Z&X-Amz-Expires=43200&X-Amz-SignedHeaders=host&X-Amz-Signature=7270257d18d101fbcd3201a51fa379beb675cfd9ab578c2c6b36572b9a555889",
          ]  },
        })
        if(error){

          throw new Error("Error in getting AI generated postcards")
        }
        console.log("ai generated postcards----->", data);

const cleanHtmlDataList = data.postcards.map(card => {
  const cleanHtmlContent= card
    .replace(/^```html\s*/i, '')
    .replace(/```$/i, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();

    return {
      id: crypto.randomUUID(),
      template_id: crypto.randomUUID(),
      html: cleanHtmlContent,
      metadata: ""
    };
});

console.log("cleanHtmlList----->", cleanHtmlDataList);
        return cleanHtmlDataList;
      } catch (error) {
        console.log("error---->", error.message)
        console.error(error);
      }
    }

    /* Get templates from the supabase */
    const getTemplates = async () => {
      try {
        const { data, error } = await supabase
        .from("master_campaign")
        .select("*");

        if(error){
          throw new Error("Error in getting templates")
        }
        
        /* brand.dev */
        return data.length>0 ? data : []
      } catch (error) {
        console.error(error?.stack)
      };
    };

    const getAiSuggestionsForTemplates = async (templatesData)=>{
      try {
        if(!apiResponse){
          throw new Error("No details about brand")
        }
        const {brand}= apiResponse;
        const {data, error}= await supabase.functions.invoke('open-ai-templates-suggestion',{
          body: { brand, templates:templatesData },
        })
        if(error){
          throw new Error("Error in getting Ai suggestions")
        }

        setAiResponse(JSON.parse(data.data));
        return JSON.parse(data.data)
      } catch (error) {
          toast.error(`Error ${error?.message? error?.message: "Error in getting Ai suggestions"}`)
      }
    }

    const initializeTemplates = async () => {
      try {
        setLoading(true);
        // Step 1: Get templates from database
        const templatesData =await getAigeneraterPostCards()
        console.log("templatesData--->", templatesData)
        if(!templatesData||templatesData.length==0){
          throw new Error("Error in fetching the templates");
        }
          // Step 2: Get AI suggestions BEFORE template injection
          // const aiSuggestions = await getAiSuggestionsForTemplates(templatesData);
          
          // // Step 3: Store AI scores and sort templates
          // const templatesWithScores = processAiScoresAndSort(templatesData, aiSuggestions);
          
          // // Step 4: Now inject brand data into sorted templates
          // const processedTemplates = await injectBrandDataIntoTemplates(templatesWithScores);
          // const maxScore = Math.max(...processedTemplates.map(t => t.score));
          // const templatesWithFlag = processedTemplates.map(template => ({
          //   ...template,
          //   isBestRating: template.score === maxScore
          // }));
          
          setTemplates(templatesData);
          // setAiResponse(aiSuggestions);
        
      } catch (error) {
        toast.error("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    /* Dynamic Templates */
    const dynamicTemplate = (template) => {
      try {
        // Handling the null values
        if (!template || !template.meta_data || !brand) return template;

        // Brand.dev Data's
        const { name, website, phone, colors } = brand;        
        
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
              children: page.children.map(child =>
                child.type === "text"
                  ? {
                      ...child,
                      text: postgridTextReplace(child.text, brand),
                      fill: textColor
                    }
                  : child
              )
            }))
          }
        };
        

        return {
          ...template,
          html: DynamicTemplates,
          meta_data: JSON.stringify(updatedMeta),
          aiScore: aiScores[template.template_id]?.score || 0,
        };
      } catch (error) {
        console.error(error);
      };
    };

    const processAiScoresAndSort = (templatesData, aiSuggestions) => {
      
      const scoresMap = {};
      
      if (aiSuggestions?.ranking) { 
        aiSuggestions.ranking.forEach(item => {
          scoresMap[item.templateId] = {
            score: item.score || 0,
            reason: item.reason || '',
            tone:item?.tone||'',
            welComeMessage:item?.welcomeMessage||''
          };
        });
      } else {
          throw new Error("No Ai ranking available for mapping the data")
      }
      
      setAiScores(scoresMap);

      const sortedTemplates = templatesData.map(item => ({
        ...item,
        score: scoresMap[item.template_id]?.score || 0,
        welcomeMessage:scoresMap[item.template_id]?.welComeMessage||'',
        tone:scoresMap[item.template_id]?.tone||'',
    }))
    .sort((a, b) => b.score - a.score);
      
    return sortedTemplates;
    };
    const injectBrandDataIntoTemplates = async (templatesData) => {
      return templatesData.map(template => dynamicTemplate(template));
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
    
    /* get metadata */
    const getMetaDataForPostgrid = async (html) => {
      try {
        /* Reference MetaData For AI Models */
        const referenceMetaData = {
          "editorCollateral": "postcard_6x4",
          "editorCollateralDest": "us_intl",
          "editorData": {
            "audios": [],
            "dpi": 72,
            "fonts": [],
            "height": 408,
            "pages": [
              {
                "id": "nmxfqtAflo",
                "background": "white",
                "bleed": 0,
                "children": [
                  {
                    "id": "foC5djY92b",
                    "alwaysOnTop": false,
                    "animations": [],
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "color": "rgba(60, 179, 113, 0.3)",
                    "contentEditable": true,
                    "draggable": true,
                    "grayscaleEnabled": false,
                    "height": 384,
                    "name": "",
                    "opacity": 1,
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "styleEditable": true,
                    "type": "guideline",
                    "visible": true,
                    "width": 576,
                    "x": 12,
                    "y": 12
                  },
                  {
                    "id": "igJpEcKW6G",
                    "alwaysOnTop": false,
                    "animations": [],
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "color": "rgba(255, 0, 0, 0.3)",
                    "contentEditable": true,
                    "draggable": true,
                    "grayscaleEnabled": false,
                    "height": 360,
                    "name": "",
                    "opacity": 1,
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "styleEditable": true,
                    "type": "guideline",
                    "visible": true,
                    "width": 552,
                    "x": 24,
                    "y": 24
                  },
                  {
                    "id": "rW9ybAuPCj",
                    "alwaysOnTop": false,
                    "animations": [],
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "borderColor": "black",
                    "borderSize": 0,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "clipSrc": "",
                    "contentEditable": true,
                    "cornerRadius": 0,
                    "cropHeight": 0.9999999999999999,
                    "cropWidth": 1,
                    "cropX": 0,
                    "cropY": 0,
                    "draggable": true,
                    "flipX": false,
                    "flipY": false,
                    "grayscaleEnabled": false,
                    "height": 208.17201718042574,
                    "keepRatio": false,
                    "name": "",
                    "opacity": 1,
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "src": "https://images.unsplash.com/photo-1549716679-95380658d5cd?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxMTY5OTZ8MHwxfHNlYXJjaHwxM3x8Y2FudmFzfGVufDB8fHx8MTc2MDEzMTE3MHww&ixlib=rb-4.1.0&q=85",
                    "styleEditable": true,
                    "type": "image",
                    "visible": true,
                    "width": 312.25802577063865,
                    "x": 36.514849263006624,
                    "y": 112.07588901722906
                  },
                  {
                    "id": "_WOSXVgX2s",
                    "align": "center",
                    "alwaysOnTop": false,
                    "animations": [],
                    "backgroundColor": "#7ED321",
                    "backgroundCornerRadius": 0.5,
                    "backgroundEnabled": false,
                    "backgroundOpacity": 1,
                    "backgroundPadding": 0.5,
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "contentEditable": true,
                    "draggable": true,
                    "fill": "rgba(253,206,19,1)",
                    "fontFamily": "Zilla Slab Highlight",
                    "fontSize": 28.443928221993513,
                    "fontStyle": "normal",
                    "fontWeight": "normal",
                    "grayscaleEnabled": false,
                    "height": 34.13750076293945,
                    "letterSpacing": 0,
                    "lineHeight": 1.2,
                    "name": "",
                    "opacity": 1,
                    "placeholder": "",
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "stroke": "black",
                    "strokeWidth": 0,
                    "styleEditable": true,
                    "text": "BLACK FRIDAY",
                    "textDecoration": "",
                    "type": "text",
                    "verticalAlign": "top",
                    "visible": true,
                    "width": 198.07420146064513,
                    "x": 31.113653038521555,
                    "y": 51.436592762290786
                  },
                  {
                    "id": "1GntRJJ38e",
                    "align": "center",
                    "alwaysOnTop": false,
                    "animations": [],
                    "backgroundColor": "#7ED321",
                    "backgroundCornerRadius": 0.5,
                    "backgroundEnabled": false,
                    "backgroundOpacity": 1,
                    "backgroundPadding": 0.5,
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "contentEditable": true,
                    "draggable": true,
                    "fill": "rgba(253,206,19,1)",
                    "fontFamily": "Oswald",
                    "fontSize": 15.377612976565294,
                    "fontStyle": "normal",
                    "fontWeight": "normal",
                    "grayscaleEnabled": false,
                    "height": 18.450000762939453,
                    "letterSpacing": 0,
                    "lineHeight": 1.2,
                    "name": "",
                    "opacity": 1,
                    "placeholder": "",
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "stroke": "black",
                    "strokeWidth": 0,
                    "styleEditable": true,
                    "text": "SALE UPTO 30% OFF",
                    "textDecoration": "",
                    "type": "text",
                    "verticalAlign": "top",
                    "visible": true,
                    "width": 124.98621675896364,
                    "x": 67.65764538936234,
                    "y": 32.98345719041245
                  },
                  {
                    "id": "YlymRily-4",
                    "align": "center",
                    "alwaysOnTop": false,
                    "animations": [],
                    "backgroundColor": "#7ED321",
                    "backgroundCornerRadius": 0.5,
                    "backgroundEnabled": false,
                    "backgroundOpacity": 1,
                    "backgroundPadding": 0.5,
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "contentEditable": true,
                    "draggable": true,
                    "fill": "rgba(245,125,47,1)",
                    "fontFamily": "Fredericka the Great",
                    "fontSize": 55.84927320360372,
                    "fontStyle": "normal",
                    "fontWeight": "normal",
                    "grayscaleEnabled": false,
                    "height": 134.02500915527344,
                    "letterSpacing": 0,
                    "lineHeight": 1.2,
                    "name": "",
                    "opacity": 1,
                    "placeholder": "",
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "stroke": "black",
                    "strokeWidth": 0,
                    "styleEditable": true,
                    "text": "HAND\nMADE",
                    "textDecoration": "",
                    "type": "text",
                    "verticalAlign": "top",
                    "visible": true,
                    "width": 173.08178776333975,
                    "x": 394.36362873139535,
                    "y": 69.9749908447265
                  },
                  {
                    "id": "Ya_W07LCuc",
                    "alwaysOnTop": false,
                    "animations": [],
                    "blurEnabled": false,
                    "blurRadius": 10,
                    "brightness": 0,
                    "brightnessEnabled": false,
                    "contentEditable": true,
                    "cornerRadius": 0,
                    "dash": [
                      2,
                      1
                    ],
                    "draggable": true,
                    "fill": "rgba(184,1,1,1)",
                    "grayscaleEnabled": false,
                    "height": 140,
                    "name": "",
                    "opacity": 1,
                    "removable": true,
                    "resizable": true,
                    "rotation": 0,
                    "selectable": true,
                    "sepiaEnabled": false,
                    "shadowBlur": 5,
                    "shadowColor": "black",
                    "shadowEnabled": false,
                    "shadowOffsetX": 0,
                    "shadowOffsetY": 0,
                    "shadowOpacity": 1,
                    "showInExport": true,
                    "stroke": "#0c0c0c",
                    "strokeWidth": 6,
                    "styleEditable": true,
                    "subType": "circle",
                    "type": "figure",
                    "visible": true,
                    "width": 140,
                    "x": 394.3636287313953,
                    "y": 216.16189760744186
                  }
                ],
                "duration": 5000,
                "height": "auto",
                "width": "auto"
              }
            ],
            "unit": "px",
            "width": 600
          },
          "editorPostcardSide": "front"
        };

        /* Here I'm Invoking The Generate MetaData PaRt */
        const { data, error } = await supabase.functions.invoke("ai-generate-metadata", {
          body: {
            metaData: referenceMetaData,
            html
          }
        });

        return data?.finalMetaData;
      } catch (error) {
        console.error(error)
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
          // const metaData = typeof selectedTemplate.meta_data == "string" ? JSON.parse(selectedTemplate.meta_data): selectedTemplate.meta_data;
          // const postgridMetaData = structuredClone(metaData);
          console.log(selectedTemplate);
          
          const postgridMetaData = await getMetaDataForPostgrid(selectedTemplate?.html);
          console.log(postgridMetaData, ">>>>>>>>>>>>");
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
            localStorage.setItem('postgrid-template-id', data?.data?.id);
            
            toast.success('Template saved!', { id: 'save-template' });
            navigate('/campaign/step3');
            return;
          };
          throw new Error('Failed to update campaign with template');
        } catch (error) {
          toast.error('Failed to save template. Please try again.', { id: 'save-template' });
        };
      };
    };
    return (
            <React.Fragment>
            <main>
                <ProcessLayout 
                  currentStep={2} 
                  totalSteps={totalSteps}
                  // footerMessage={selectedTemplate
                    //     ? `Continue with ${selectedTemplate.description} template`
                    //     : "Please select a template before continuing to the editor"}
                  onContinue={handleContinue}
                  continueDisabled={!selectedTemplate}
                  onSkip={() => navigate('/dashboard')}
                  skipText="Cancel"
                >
                  
                    {/* Hero Section */}
                    <section className="text-center m-6">
                        <div className="inline-flex items-center gap-2 px-5 py-5 rounded-full p-2 bg-[#d1efe8] text-[#16be9c] text-sm font-semibold mb-6">
                            <Layout className="w-4 h-4" />
                            Step 2 of 4 • Template Selection
                        </div>
                        <h1 className="text-4xl md:text-5xl m-6 font-black text-foreground tracking-tight">
                            Choose your postcard design
                        </h1>
                        <div className='flex justify-center'>
                            <p className="text-lg text-[#b5b0c3] max-w-2xl mx-auto">
                                AI-curated designs for <span className="font-semibold text-[#2ac3a4]">{brand?.category && brand?.category}</span> based on your brand
                            </p>
                        </div>
                    </section>

                    {/* AI Banner */}
                    <div className="p-4 rounded-2xl gradient-primary-accent border border-[#c7ede5]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-3xl bg-[#1bc7c2]  flex items-center justify-center shadow-glow-sm">
                          <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="font-bold text-foreground">
                            {loading ? 'AI is analyzing templates...' : 'AI-curated templates'}
                          </h2>
                          <p className="text-sm text-[#b5b0c3]">
                            Matching your brand colors and {brand?.category && brand?.category} category
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                      <div className="flex flex-col items-center justify-center pt-12 mb-12">
                        <Loader2 className="w-8 h-8 text-[#4928ed] animate-spin mb-4" />
                        <p className="text-lg text-[#b5b0c3]">
                          AI is analyzing and sorting templates by relevance...
                        </p>
                      </div>
                    )}

                    {/* Cards - Only show when not loading */}
                    {!loading && (
                      <div className="grid post-card grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9">
                        {templates.map((template) => (
                          <PreviewCards 
                            key={template.template_id} 
                            handleTemplateSelect={handleTemplateSelect}
                            selectedTemplates={selectedTemplateId == template.template_id} 
                            masterTemplate={template}
                            aiScore={template?.score}
                            welcomeMessage={template?.welcomeMessage}
                            tone={template?.tone}
                            isBestRating={template?.isBestRating}
                          />
                        ))}
                      </div>
                    )}

                    {/* After Selection */}
                    {selectedTemplateId && !loading && (
                      <div className="p-4 selected after-select rounded-2xl bg-[#e3f2ee] border border-[#c4e8df] animate-scale-in">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#bbe6d9] flex items-center justify-center">
                            <Check className="w-6 h-6 text-[#23b987]" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-foreground">Selected Template</p>
                            {selectedTemplate?.aiScore > 0 && (
                              <p className="text-sm text-muted-foreground">
                                AI Relevance Score: {selectedTemplate.aiScore}/100
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">Click Continue to customize this design with AI</p>
                          </div>
                        </div>
                      </div>
                    )}
                </ProcessLayout>  
            </main>
        </React.Fragment>
    );
};

export default SelectTemplates;
