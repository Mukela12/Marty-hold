import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { adminPostcardService } from '../../supabase/api/adminPostcardService';
import './PostcardPreviewRenderer.css';

/**
 * PostcardPreviewRenderer - Renders postcard previews from multiple sources
 * Supports: Image URL, HTML content, PostGrid template, or placeholder
 */
const PostcardPreviewRenderer = ({
  previewUrl,
  frontHtml: propFrontHtml,
  backHtml: propBackHtml,
  templateId,
  backTemplateId,
  templateName,
  companyLogo,
  companyName,
  primaryColor,
  size = 'large', // 'small', 'medium', 'large'
  showControls = true,
  className = ''
}) => {
  const [currentSide, setCurrentSide] = useState('front');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fetchedFrontHtml, setFetchedFrontHtml] = useState(null);
  const [fetchedBackHtml, setFetchedBackHtml] = useState(null);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);
  const iframeRef = useRef(null);

  // Use prop HTML or fetched HTML
  const frontHtml = propFrontHtml || fetchedFrontHtml;
  const backHtml = propBackHtml || fetchedBackHtml;

  // Determine what content to show
  const hasImagePreview = previewUrl && !previewUrl.startsWith('/template-previews/');
  const hasHtmlContent = frontHtml || backHtml;
  const hasTemplate = templateId;

  // Fetch PostGrid template HTML when templateId is provided but no HTML
  useEffect(() => {
    const fetchTemplateHtml = async () => {
      if (templateId && !propFrontHtml && !fetchedFrontHtml && !isFetchingTemplate) {
        setIsFetchingTemplate(true);
        setIsLoading(true);

        try {
          const result = await adminPostcardService.fetchCampaignTemplates(
            templateId,
            backTemplateId
          );

          if (result.success) {
            if (result.frontHtml) {
              setFetchedFrontHtml(result.frontHtml);
            }
            if (result.backHtml) {
              setFetchedBackHtml(result.backHtml);
            }
          }
        } catch (error) {
          console.error('Error fetching template:', error);
        } finally {
          setIsFetchingTemplate(false);
          setIsLoading(false);
        }
      }
    };

    fetchTemplateHtml();
  }, [templateId, backTemplateId, propFrontHtml, fetchedFrontHtml, isFetchingTemplate]);

  useEffect(() => {
    if (!isFetchingTemplate) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [previewUrl, propFrontHtml, propBackHtml]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleSide = () => {
    setCurrentSide(prev => prev === 'front' ? 'back' : 'front');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  // Generate HTML wrapper for iframe
  const generateIframeHtml = (htmlContent) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 100%;
              height: 100%;
              overflow: hidden;
              background: #fff;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .postcard-container {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <div class="postcard-container">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;
  };

  // Render placeholder when no preview available
  const renderPlaceholder = () => (
    <div className="postcard-preview-placeholder">
      <div className="placeholder-icon">
        {isFetchingTemplate ? (
          <Loader2 size={48} className="animate-spin" />
        ) : (
          <Mail size={48} strokeWidth={1.5} />
        )}
      </div>
      <div className="placeholder-content">
        <h4>{isFetchingTemplate ? 'Loading Preview...' : 'No Preview Available'}</h4>
        <p>
          {isFetchingTemplate
            ? 'Fetching template from PostGrid...'
            : hasTemplate
              ? 'Template preview could not be loaded'
              : 'Postcard design not yet created'}
        </p>
      </div>
      {templateName && (
        <div className="placeholder-template-badge">
          <FileText size={14} />
          {templateName}
        </div>
      )}
    </div>
  );

  // Render image preview
  const renderImagePreview = () => (
    <div className="postcard-preview-image-container">
      {isLoading && (
        <div className="postcard-preview-loading">
          <Loader2 className="animate-spin" size={32} />
          <span>Loading preview...</span>
        </div>
      )}
      <img
        src={previewUrl}
        alt="Postcard preview"
        className={`postcard-preview-image ${isLoading ? 'loading' : ''}`}
        style={{ transform: `scale(${zoom})` }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );

  // Render HTML preview in iframe
  const renderHtmlPreview = () => {
    const htmlContent = currentSide === 'front' ? frontHtml : backHtml;

    if (!htmlContent) {
      return (
        <div className="postcard-preview-no-content">
          <AlertCircle size={24} />
          <span>No {currentSide} design available</span>
        </div>
      );
    }

    return (
      <div className="postcard-preview-iframe-container">
        <iframe
          ref={iframeRef}
          srcDoc={generateIframeHtml(htmlContent)}
          title={`Postcard ${currentSide}`}
          className="postcard-preview-iframe"
          style={{ transform: `scale(${zoom})` }}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-same-origin"
        />
      </div>
    );
  };

  // Determine which renderer to use
  const renderPreview = () => {
    if (hasError) {
      return renderPlaceholder();
    }

    // Show loading placeholder while fetching template
    if (isFetchingTemplate) {
      return renderPlaceholder();
    }

    if (hasImagePreview) {
      return renderImagePreview();
    }

    if (hasHtmlContent) {
      return renderHtmlPreview();
    }

    return renderPlaceholder();
  };

  // Size classes
  const sizeClasses = {
    small: 'postcard-preview-small',
    medium: 'postcard-preview-medium',
    large: 'postcard-preview-large'
  };

  return (
    <>
      <div className={`postcard-preview-renderer ${sizeClasses[size]} ${className}`}>
        {/* Preview Container */}
        <motion.div
          className="postcard-preview-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {renderPreview()}

          {/* Overlay gradient for depth */}
          <div className="postcard-preview-gradient" />
        </motion.div>

        {/* Controls */}
        {showControls && (
          <div className="postcard-preview-controls">
            {/* Side Toggle (only for HTML content) */}
            {hasHtmlContent && backHtml && (
              <button
                className="preview-control-btn"
                onClick={toggleSide}
                title={`View ${currentSide === 'front' ? 'back' : 'front'}`}
              >
                <RotateCw size={16} />
                <span>{currentSide === 'front' ? 'Back' : 'Front'}</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="preview-zoom-controls">
              <button
                className="preview-control-btn icon-only"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                className="preview-control-btn icon-only"
                onClick={handleZoomIn}
                disabled={zoom >= 2}
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            {/* Fullscreen */}
            <button
              className="preview-control-btn icon-only"
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        )}

        {/* Template Badge */}
        {templateName && (
          <div className="postcard-template-badge">
            <FileText size={12} />
            {templateName}
          </div>
        )}

        {/* Side Indicator (for HTML content) */}
        {hasHtmlContent && (
          <div className="postcard-side-indicator">
            {currentSide === 'front' ? 'Front' : 'Back'}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            className="postcard-fullscreen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFullscreen(false)}
          >
            <motion.div
              className="postcard-fullscreen-container"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="fullscreen-close-btn"
                onClick={() => setIsFullscreen(false)}
              >
                <X size={24} />
              </button>

              <div className="fullscreen-preview-content">
                {renderPreview()}
              </div>

              {hasHtmlContent && backHtml && (
                <div className="fullscreen-controls">
                  <button
                    className={`fullscreen-side-btn ${currentSide === 'front' ? 'active' : ''}`}
                    onClick={() => setCurrentSide('front')}
                  >
                    Front
                  </button>
                  <button
                    className={`fullscreen-side-btn ${currentSide === 'back' ? 'active' : ''}`}
                    onClick={() => setCurrentSide('back')}
                  >
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PostcardPreviewRenderer;
