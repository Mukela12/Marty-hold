import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';

import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx';
import { BrandDevProvider } from './contexts/BrandDevContext.jsx';
import { PostcardProvider } from './contexts/PostCardContext.jsx';

createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <BrowserRouter>
      <AuthProvider>
    
      <BrandDevProvider>
      <PostcardProvider>
      <App />
      </PostcardProvider>
      </BrandDevProvider>
       
      </AuthProvider>

    </BrowserRouter>

  // </StrictMode>
)
