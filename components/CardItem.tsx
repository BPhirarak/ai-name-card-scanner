import React, { useState, useEffect } from 'react';
import { Base64ImageStorage } from '../services/firebase';
import type { BusinessCard } from '../types';

// Image Modal Component (inline to avoid import issues)
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

// CardItem Component
interface CardItemProps {
    card: BusinessCard;
    onEdit: (card: BusinessCard) => void;
    onDelete: (id: string) => void;
    isShareMode?: boolean;
    canEdit?: boolean;
}

const CardItem: React.FC<CardItemProps> = ({ card, onEdit, onDelete, isShareMode = false, canEdit = true }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const displayName = card.name_en || card.name_th || 'Unknown Name';

    // Load image from database if it's a db-image URL
    useEffect(() => {
        const loadImage = async () => {
            const cardImageUrl = (card as any).imageUrl;
            
            if (!cardImageUrl) {
                setImageLoading(false);
                return;
            }

            // If it's a database image, retrieve the base64 data
            if (cardImageUrl.startsWith('db-image:')) {
                try {
                    console.log('🔍 Loading image for card:', card.id, cardImageUrl);
                    const base64Data = await Base64ImageStorage.getImage(cardImageUrl);
                    
                    if (base64Data) {
                        setDisplayImageUrl(base64Data);
                        setImageError(false);
                        console.log('✅ Image loaded successfully for card:', card.id);
                    } else {
                        console.warn('⚠️ No image data found for card:', card.id);
                        setImageError(true);
                    }
                } catch (error) {
                    console.error('❌ Failed to load image for card:', card.id, error);
                    setImageError(true);
                }
            } else {
                // Regular URL, use as-is
                setDisplayImageUrl(cardImageUrl);
            }
            
            setImageLoading(false);
        };

        loadImage();
    }, [card.id, (card as any).imageUrl]);

    const handleImageLoad = () => {
        setImageLoading(false);
        setImageError(false);
    };

    const handleImageError = () => {
        setImageLoading(false);
        setImageError(true);
        console.warn('Failed to display image for card:', card.id);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        console.log('✏️ Edit button clicked for card:', card.id);
        onEdit(card);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        console.log('🗑️ Delete button clicked for card:', card.id);
        onDelete(card.id!);
    };

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        if (displayImageUrl && !imageError) {
            console.log('🖼️ Image clicked, opening modal for card:', card.id);
            setShowImageModal(true);
        }
    };

    const handleImageTextClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click event
        if (displayImageUrl && !imageError) {
            console.log('🖼️ Image text clicked, opening modal for card:', card.id);
            setShowImageModal(true);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                <div className="flex gap-4">
                    {/* Image Section */}
                    <div className="flex-shrink-0">
                        {displayImageUrl && !imageError ? (
                            <div 
                                className="relative w-24 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 group cursor-pointer hover:border-blue-400 transition-all duration-200"
                                onClick={handleImageClick}
                                title="Click to view full size image"
                            >
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-xs text-slate-500">Loading...</div>
                                    </div>
                                )}
                                <img
                                    src={displayImageUrl}
                                    alt={`Business card for ${displayName}`}
                                    className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} group-hover:opacity-80 transition-opacity duration-200`}
                                    onLoad={handleImageLoad}
                                    onError={handleImageError}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
                                        🔍 View Full Size
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-24 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                                <div className="text-center text-slate-500 dark:text-slate-400">
                                    <div className="text-lg">📄</div>
                                    <div className="text-xs">
                                        {imageLoading ? 'Loading...' : 'No Image'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {displayName}
                            </h3>
                            {!isShareMode && canEdit && (
                                <div className="flex gap-2 ml-2">
                                    <button
                                        onClick={handleEditClick}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="Edit card"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={handleDeleteClick}
                                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Delete card"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                            {card.company && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">🏢</span>
                                    <span className="truncate">{card.company}</span>
                                </div>
                            )}
                            
                            {card.title && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">💼</span>
                                    <span className="truncate">{card.title}</span>
                                </div>
                            )}
                            
                            {card.email && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">📧</span>
                                    <span className="truncate">{card.email}</span>
                                </div>
                            )}
                            
                            {card.phone_mobile && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">📱</span>
                                    <span className="truncate">{card.phone_mobile}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <span>📂</span>
                                    {card.category || 'ไม่ระบุ'}
                                </span>
                                {card.createdBy && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400">
                                        <span>👤</span>
                                        {card.createdBy}
                                    </span>
                                )}
                                {card.sharedWith && card.sharedWith.length > 0 && (
                                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded text-green-600 dark:text-green-400">
                                        <span>🔗</span>
                                        แชร์ให้ {card.sharedWith.length} คน
                                    </span>
                                )}
                            </div>
                            <span className="flex items-center gap-1">
                                {displayImageUrl && !imageError ? (
                                    <>
                                        <span>📸</span>
                                        <span 
                                            className="cursor-pointer hover:text-blue-500 hover:underline transition-colors"
                                            onClick={handleImageTextClick}
                                            title="Click to view image"
                                        >
                                            Has Image (Click to view)
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span>📄</span>
                                        No Image
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Click hint */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        👆 Click anywhere on this card to view and edit details
                        {displayImageUrl && !imageError && (
                            <span className="block mt-1 text-blue-500">
                                🖼️ Click on the image or "Has Image" text to view full size
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            <ImageModal
                isOpen={showImageModal}
                imageUrl={displayImageUrl}
                imageName={`${displayName} - Business Card`}
                onClose={() => {
                    console.log('🔒 Closing image modal for card:', card.id);
                    setShowImageModal(false);
                }}
            />
        </>
    );
};

export default CardItem;