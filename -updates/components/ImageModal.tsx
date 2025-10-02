import React from 'react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  imageName?: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, imageUrl, imageName, onClose }) => {
  if (!isOpen || !imageUrl) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="relative max-w-4xl max-h-full bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {imageName || 'Business Card Image'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Image */}
        <div className="p-4">
          <img
            src={imageUrl}
            alt={imageName || 'Business Card'}
            className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg shadow-lg"
            style={{ minHeight: '200px' }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
          <a
            href={imageUrl}
            download={imageName || 'business-card.jpg'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;