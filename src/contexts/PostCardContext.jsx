import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/integration/client';

const PostcardContext = createContext();

export const PostcardProvider = ({ children }) => {
  const [postcards, setPostcards] = useState([]);
  const [isContextLoading, setIsContextLoading] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('cached_postcards');
    if (savedData) {
      try {
        setPostcards(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse cached postcards", e);
        localStorage.removeItem('cached_postcards');
      }
    }
  }, []);

  const getOrFetchPostcards = async (images, brandData) => {
    const localData = localStorage.getItem('cached_postcards');
    if (postcards.length > 0) return postcards;
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        setPostcards(parsed);
        return parsed;
      } catch {
        localStorage.removeItem('cached_postcards');
      }
    }

    setIsContextLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('postcard-html-generator', {
        body: {
          images: images,
          brand: brandData
        },
      });

      if (error) throw error;

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      const cleanHtmlDataList = parsedData.postcards.map(item => ({
        id: crypto.randomUUID(),
        template_id: crypto.randomUUID(),
        html: item.html,
        welcomeMessage: item?.welcomeMessageData,
        tagline: item?.taglineData,
        metadata: ""
      }));

      setPostcards(cleanHtmlDataList);
      localStorage.setItem('cached_postcards', JSON.stringify(cleanHtmlDataList));
      
      return cleanHtmlDataList;
    } catch (err) {
      console.error("Edge Function Error:", err);
      throw err;
    } finally {
      setIsContextLoading(false);
    }
  };

  const clearCache = () => {
    localStorage.removeItem('cached_postcards');
    setPostcards([]);
  };

  return (
    <PostcardContext.Provider value={{ postcards, isContextLoading, getOrFetchPostcards, clearCache }}>
      {children}
    </PostcardContext.Provider>
  );
};

export const usePostcards = () => useContext(PostcardContext);