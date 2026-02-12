import React, { useEffect, useState } from 'react';
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
        {editorUrl ? (
          <iframe
            src={editorUrl}
            title="PostGrid Editor"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <p>Loading PostGrid editor...</p>
        )}
      </section>
    </main>
  );
};

export default CampaignPostGridEdit;
