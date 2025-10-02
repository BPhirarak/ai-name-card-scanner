import React, { useState, useEffect } from 'react';
import { Base64ImageStorage } from '../services/firebase';
import { saveCard, saveCategory, listenForCategories } from '../services/contactService';
import type { BusinessCard } from '../types';
import ImageModal from './ImageModal';

interface CardDetailModalProps {
  isOpen: boolean;
  card: BusinessCard | null;
  onClose: () => void;
  onSave: (updatedCard: BusinessCard) => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ isOpen, card, onClose, onSave }) => {
  const [editedCard, setEditedCard] = useState<BusinessCard | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Initialize edited card when modal opens
  useEffect(() => {
    if (isOpen && card) {
      setEditedCard({ ...card });
      loadCardImage(card);
    } else {
      setEditedCard(null);
      setDisplayImageUrl(null);
    }
  }, [isOpen, card]);

  // Listen for categories
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = listenForCategories(setCategories);
      return () => unsubscribe();
    }
  }, [isOpen]);

  const loadCardImage = async (cardData: BusinessCard) => {
    const cardImageUrl = (cardData as any).imageUrl;
    
    if (!cardImageUrl) return;

    if (cardImageUrl.startsWith('db-image:')) {
      setImageLoading(true);
      try {
        const base64Data = await Base64ImageStorage.getImage(cardImageUrl);
        if (base64Data) {
          setDisplayImageUrl(base64Data);
        }
      } catch (error) {
        console.error('Failed to load card image:', error);
      } finally {
        setImageLoading(false);
      }
    } else {
      setDisplayImageUrl(cardImageUrl);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!editedCard) return;
    
    setEditedCard({
      ...editedCard,
      [e.target.name]: e.target.value
    });
  };

  const handleAddCategory = async () => {
    if (newCategory && !categories.includes(newCategory)) {
      try {
        await saveCategory(newCategory);
        if (editedCard) {
          setEditedCard({ ...editedCard, category: newCategory });
        }
        setNewCategory('');
      } catch (error) {
        console.error('Failed to add category:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!editedCard) return;

    setIsSaving(true);
    try {
      await saveCard(editedCard);
      onSave(editedCard);
      onClose();
    } catch (error) {
      console.error('Failed to save card:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownloadVcf = () => {
    if (!editedCard) return;

    const displayName = editedCard.name_en || editedCard.name_th || 'Unknown';
    let phoneVcf = '';
    if (editedCard.phone_mobile) {
      phoneVcf += `TEL;TYPE=CELL:${editedCard.phone_mobile}\n`;
    }
    if (editedCard.phone_office) {
      phoneVcf += `TEL;TYPE=WORK,VOICE:${editedCard.phone_office}\n`;
    }

    const vcfContent = `BEGIN:VCARD
VERSION:3.0
FN:${displayName}
ORG:${editedCard.company}
TITLE:${editedCard.title}
${phoneVcf}EMAIL:${editedCard.email}
URL:${editedCard.website}
ADR;TYPE=WORK:;;${editedCard.address.replace(/\n/g, ';')}
CATEGORIES:${editedCard.category}
END:VCARD`;

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayName.replace(/\s/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !editedCard) return null;

  const displayName = editedCard.name_en || editedCard.name_th || 'Unknown Name';

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Edit Business Card
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Image Section */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-100">
                  Business Card Image
                </h3>
                
                {displayImageUrl ? (
                  <div className="relative">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <div className="text-slate-500">Loading...</div>
                      </div>
                    )}
                    <img
                      src={displayImageUrl}
                      alt={`Business card for ${displayName}`}
                      className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowImageModal(true)}
                    />
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hover:bg-opacity-70 transition-colors"
                    >
                      🔍 View Full Size
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                    <div className="text-center text-slate-500 dark:text-slate-400">
                      <div className="text-4xl mb-2">📄</div>
                      <div>No Image</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Section */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name (Thai)
                    </label>
                    <input
                      type="text"
                      name="name_th"
                      value={editedCard.name_th}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name (English)
                    </label>
                    <input
                      type="text"
                      name="name_en"
                      value={editedCard.name_en}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={editedCard.company}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editedCard.title}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Phone
                    </label>
                    <input
                      type="tel"
                      name="phone_mobile"
                      value={editedCard.phone_mobile}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Office Phone
                    </label>
                    <input
                      type="tel"
                      name="phone_office"
                      value={editedCard.phone_office}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={editedCard.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={editedCard.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={editedCard.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      value={editedCard.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Add New Category
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="New category"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleDownloadVcf}
              className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              📄 Download VCF
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        imageUrl={displayImageUrl}
        imageName={`${displayName} - Business Card`}
        onClose={() => setShowImageModal(false)}
      />
    </>
  );
};

export default CardDetailModal;