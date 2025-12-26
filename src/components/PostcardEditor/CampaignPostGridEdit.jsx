import React, { useEffect, useState } from 'react';
import PostGridEditor from '../campaign/PostGridEditor';
import { supabase } from '../../supabase/integration/client';

const CampaignPostGridEdit = ({ template }) => {
  const [editorUrl, setEditorUrl] = useState("");

  useEffect(() => {
    getPostGridEditorSession(template);
  }, []);

  async function getPostGridEditorSession(templateId) {
    try {
      const { data } = await supabase.functions.invoke("postgrid-editor-session", {
        body: { templateId: templateId }
      });
      setEditorUrl(data?.postGridResponse?.url)      
    } catch (error) {
      console.error(error);
    };
  };
  return (
    <main className='h-screen w-screen justify-center flex relative'>
      <section className='w-[60%] h-[50%] mt-8'>
        <PostGridEditor postGridUrl={editorUrl} />
      </section>
    </main>
  );
};

export default CampaignPostGridEdit;
