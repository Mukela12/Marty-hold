// contexts/BrandDevContext.js
import React, { createContext, useContext, useState, useCallback } from "react";
import { brandDevMockData } from "../pages/campaign/v2/GetCompanyDetails/GetCompanyUtils";
import { supabase } from "../supabase/integration/client";

const BrandDevContext = createContext(null);

export const useBrandDev = () => {
  const context = useContext(BrandDevContext);
  if (!context) {
    throw new Error("useBrandDev must be used within a BrandDevProvider");
  }
  return context;
};

const mapBrandData = (apiResponse, website) => {
  if (!apiResponse.brand) return null;

  const brandData = apiResponse.brand;

  return {
    name: brandData.title || brandData.domain.split(".")[0],
    category: brandData.industries?.eic?.[0]?.subindustry || "Technology",
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
    phone: "+81 78-123-4567",
    email: `info@${brandData.domain}`,
    logo: brandData.logos?.[0]?.url || null,
    description: brandData.description || "",
    slogan: brandData.slogan || "",
    socialLinks: brandData.socials || [],
    rawData: brandData,
  };
};

export const BrandDevProvider = ({ children }) => {
  const [apiResponse, setApiResponse] = useState(null);
  const [mappedData, setMappedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [companyDomain, setCompanyDomain]=useState(null);

  const fetchBrandData = useCallback(async (website) => {
    try {
      setLoading(true);
      setFetchSuccess(false);

      const {data:brandDevResponse, error }=await supabase.functions.invoke("brand-dev",{
        body: { companyUrl:website },
      })
      if (error) {
        throw new Error("Supabase Error:", error);
      }
      const{data:response} =brandDevResponse;


      if (response.status === "ok" && response.brand) {
        setApiResponse(response);

        const mapped = mapBrandData(response, website);
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
      console.error("Brand fetch error:", err);
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
