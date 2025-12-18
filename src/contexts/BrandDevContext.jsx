// contexts/BrandDevContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import { getCompanyDomainFromUrl, masterCategories } from "../pages/campaign/v2/GetCompanyDetails/GetCompanyUtils";
import { supabase } from "../supabase/integration/client";

const BrandDevContext = createContext(null);

export const useBrandDev = () => {
  const context = useContext(BrandDevContext);
  if (!context) {
    throw new Error("useBrandDev must be used within a BrandDevProvider");
  }
  return context;
};

const mapBrandData = (apiResponse, website, companyId, aiSuggestedCategory) => {
  if (!apiResponse.brand) return null;

  const brandData = apiResponse.brand;

  return {
    name: brandData.title || brandData.domain.split(".")[0],
    category: aiSuggestedCategory ||brandData.industries?.eic?.[0]?.industry || "other",
    colors: {
      primary: brandData.colors?.[0]?.hex || "#6366F1",
      secondary: brandData.colors?.[1]?.hex || "#F1F5F9",
      palette: brandData.colors || [],
    },
    website: website || brandData.domain,
    address: brandData.address
      ? `${brandData.address.city || ""}, ${
          brandData.address.country || ""
        }`.trim()
      : "",
    phone: brandData?.phone||"",
    email: `info@${brandData.domain}`,
    logo: brandData.logos?.[0]?.url || null,
    description: brandData.description || "",
    slogan: brandData.slogan || "",
    socialLinks: brandData.socials || [],
    rawData: brandData,
    companyId: companyId
  };
};

const getCompanyDetails = async(url)=>{
  try {
    const domain = getCompanyDomainFromUrl(url);
    const { data, error } = await supabase
    .from('companies')
    .select('website, domain, business_category, brandfetch_data, id')
    .eq('domain', domain)
    .order('created_at', { ascending: false })
    .limit(1);
    if(error){
      throw new Error("Error while fetching company details")
    }
    return data;
  } catch (error) {
    throw error;
  }
}

const getBrandFetchApiDetails = async(url)=>{
  try {
    const {data:brandDevResponse, error }=await supabase.functions.invoke("brand-dev",{
      body: { companyUrl:url },
    })
    if (error) {
      throw new Error("Supabase Error:", error);
    }
    const{data} =brandDevResponse;
    return data;
  } catch (error) {
    throw error;
  }
}

const insertCompanyDetails = async(apiResponse, url, userId)=>{
  try {

    const { brand } = apiResponse;
    const payload = {
      user_id: userId,
      name: brand?.title ?? null,
      website: url ?? null,
      domain: brand?.domain ?? null,
      description: brand?.description ?? null,
      industry: brand?.industries?.eic?.[0]?.industry ?? null,
      business_category: brand?.industries?.eic?.[0]?.subindustry ?? null,
      logo_url: brand?.logos?.find(l => l.type === "logo")?.url ?? null,
      logo_icon_url: brand?.logos?.find(l => l.type === "icon")?.url ?? null,
      primary_color: brand?.colors?.[0]?.hex ?? null,
      secondary_color: brand?.colors?.[1]?.hex ?? null,
      color_palette: brand?.colors?.map(c => c.hex).join(",") ?? null,
      social_links: brand?.socials
        ? JSON.stringify(brand.socials)
        : null,
      location: brand?.address
        ? `${brand.address.city}, ${brand.address.country}`
        : null,
      brandfetch_data: apiResponse 
    };
    const { data, error } = await supabase
      .from("companies")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error("Insert failed:", error);
    }
  } catch (error) {
    throw error;
  }
}

async function getMasterMappingIndustry(masterIndustries,apiResponse){
  try {
    if(!apiResponse){
      throw new Error("Brand.dev api fails to fetch the response")
    }
    const {brand} = apiResponse;
    const {industries}= brand;
    const {eic}= industries
    const {data, error}=await supabase.functions.invoke("open-ai-industry-mapping", {
      body:{brandIndustries:eic, masterIndustries:masterIndustries}
    })

    if(error){
      throw new Error("Error in master mapping")
    }
    const dataResponse = JSON.parse(data?.data)
    return dataResponse[0]?.matched_category;
  } catch (error) {
    toast.error(error?.message)
  }
  

}


export const BrandDevProvider = ({ children }) => {
  const [apiResponse, setApiResponse] = useState(null);
  const [mappedData, setMappedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [companyDomain, setCompanyDomain]=useState(null);
  const [aiCategorySuggestion, setCategoryAiSuggestion] = useState(null);

  const fetchBrandData = useCallback(async (website) => {
    try {
      setLoading(true);
      setFetchSuccess(false);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      const dbResponse = await getCompanyDetails(website);
      
      let response = null;
      let aiSuggestedCategory = null;

      if (!dbResponse?.length) {
          response = await getBrandFetchApiDetails(website);
          aiSuggestedCategory = await getMasterMappingIndustry(masterCategories,response);
          setCategoryAiSuggestion(aiSuggestedCategory);
          await insertCompanyDetails(response,website, user.id)

      } else {
          response = dbResponse[0]?.brandfetch_data ?? null;
          aiSuggestedCategory = await getMasterMappingIndustry(masterCategories, response);
          setCategoryAiSuggestion(aiSuggestedCategory);
      }

      if (response.status === "ok" && response.brand) {

        const mapped = mapBrandData(response, website, dbResponse?.[0]?.id, aiSuggestedCategory);
        setMappedData(mapped);
        setFetchSuccess(true);
        setIsEditing(false);

        return {
          apiResponse: response,
          mappedData: mapped,
          success: true,
        };
      } else {
        throw new Error("Invalid API response");
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const setCompanyDomainDetails= useCallback((domainDetails)=>{
      setCompanyDomain(domainDetails)
  }, [])

  const saveBrandData = useCallback((brandData, formValues) => {
    setMappedData(brandData);
    setIsEditing(false);
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  const clearBrandData = useCallback(() => {
    setApiResponse(null);
    setMappedData(null);
    setFetchSuccess(false);
    setIsEditing(false);
    setCompanyDomain(null);
    setLoading(false);
  }, []);

  const value = {
    apiResponse,
    mappedData,
    loading,
    fetchSuccess,
    isEditing,
    companyDomain,
    fetchBrandData,
    saveBrandData,
    toggleEditMode,
    clearBrandData,
    getBrandInfo: () => mappedData,
    getRawResponse: () => apiResponse,
    setCompanyDomainDetails
  };

  return (
    <BrandDevContext.Provider value={value}>
      {children}
    </BrandDevContext.Provider>
  );
};

export default BrandDevContext;
