import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ConfirmationModal.css';

/**
 * ConfirmationModal - A reusable confirmation dialog component
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onConfirm - Callback when confirm button is clicked
 * @param {string} title - Modal title
 * @param {string} message - Modal message/description
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} severity - Severity level: 'danger', 'warning', 'info' (default: 'danger')
 * @param {boolean} isLoading - Shows loading state on confirm button
 * @param {string} loadingText - Text shown during loading (default: "Processing...")
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'danger',
  isLoading = false,
  loadingText = 'Processing...'
}) => {
  // Select icon based on severity
  const getIcon = () => {
    switch (severity) {
      case 'danger':
        return <AlertCircle size={48} />;
      case 'warning':
        return <AlertTriangle size={48} />;
      case 'info':
        return <Info size={48} />;
      default:
        return <AlertCircle size={48} />;
    }
  };

  const handleOverlayClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
          <motion.div
            className="confirmation-modal"
            onClick={handleModalClick}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className="confirmation-modal-close"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className={`confirmation-modal-icon confirmation-modal-icon-${severity}`}>
              {getIcon()}
            </div>

            <h3 className="confirmation-modal-title">{title}</h3>

            <div className="confirmation-modal-message">
              {message}
            </div>

            <div className="confirmation-modal-actions">
              <button
                className="confirmation-modal-btn cancel"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </button>
              <button
                className={`confirmation-modal-btn confirm ${severity}`}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? loadingText : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
