import React, { useState, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { OfflineQueueStatus } from './components/OfflineQueueStatus';
import { BusinessCardImage } from './components/BusinessCardImage';
import { FirebaseStorageDebug } from './components/FirebaseStorageDebug';
import { saveCardWithImage, listenForCards } from './services/contactService';
import type { BusinessCard, UploadProgress } from './types';

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [businessCard, setBusinessCard] = useState<BusinessCard>({
    name_th: '',
    name_en: '',
    company: '',
    title: '',
    phone_mobile: '',
    phone_office: '',
    email: '',
    website: '',
    address: '',
    category: 'IT',
    createdAt: Date.now()
  });

  // Listen for cards changes
  useEffect(() => {
    console.log('👂 Setting up cards listener...');
    const unsubscribe = listenForCards((updatedCards) => {
      console.log('📋 Cards received:', updatedCards.length);
      setCards(updatedCards);
    });

    return unsubscribe;
  }, []);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    console.log('📸 Image selected:', file.name, file.size);
  };

  const handleUploadProgress = (progress: UploadProgress) => {
    setUploadProgress(progress);
    console.log(`📊 Upload progress: ${progress.percentage}%`);
  };

  const handleSaveCard = async () => {
    if (!businessCard.name_th && !businessCard.name_en) {
      alert('Please enter at least one name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      console.log('💾 Saving business card...', { hasImage: !!selectedImage });
      
      await saveCardWithImage(
        businessCard,
        selectedImage || undefined,
        handleUploadProgress
      );

      alert('Business card saved successfully!');
      
      // Reset form
      setBusinessCard({
        name_th: '',
        name_en: '',
        company: '',
        title: '',
        phone_mobile: '',
        phone_office: '',
        email: '',
        website: '',
        address: '',
        category: 'IT',
        createdAt: Date.now()
      });
      setSelectedImage(null);
      setUploadProgress(null);
    } catch (error) {
      console.error('❌ Failed to save card:', error);
      alert('Failed to save business card. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>AI Name Card Scanner</h1>
      
      {/* Debug Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowDebug(!showDebug)}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showDebug ? '🔧 Hide Debug' : '🔧 Show Debug'}
        </button>
      </div>

      {/* Debug Panel */}
      {showDebug && <FirebaseStorageDebug />}
      
      {/* Offline Queue Status */}
      <OfflineQueueStatus showDetails={true} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column - Form */}
        <div>
          {/* Image Upload Section */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Business Card Image</h3>
            <ImageUpload
              onImageSelect={handleImageSelect}
              onUploadProgress={handleUploadProgress}
              disabled={isUploading}
              showPreview={true}
            />
            
            {uploadProgress && (
              <div style={{ 
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}>
                <div>Upload Progress: {uploadProgress.percentage}%</div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress.percentage}%`,
                    height: '100%',
                    backgroundColor: '#007bff',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Business Card Form */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Business Card Information</h3>
            
            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
              <input
                type="text"
                placeholder="Name (Thai)"
                value={businessCard.name_th}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, name_th: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Name (English)"
                value={businessCard.name_en}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, name_en: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Company"
                value={businessCard.company}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, company: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Title"
                value={businessCard.title}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, title: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Mobile Phone"
                value={businessCard.phone_mobile}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, phone_mobile: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Office Phone"
                value={businessCard.phone_office}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, phone_office: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="email"
                placeholder="Email"
                value={businessCard.email}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, email: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              
              <input
                type="text"
                placeholder="Website"
                value={businessCard.website}
                onChange={(e) => setBusinessCard(prev => ({ ...prev, website: e.target.value }))}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            
            <textarea
              placeholder="Address"
              value={businessCard.address}
              onChange={(e) => setBusinessCard(prev => ({ ...prev, address: e.target.value }))}
              style={{ 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                width: '100%',
                marginTop: '10px',
                minHeight: '60px'
              }}
            />
            
            <select
              value={businessCard.category}
              onChange={(e) => setBusinessCard(prev => ({ ...prev, category: e.target.value }))}
              style={{ 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                width: '100%',
                marginTop: '10px'
              }}
            >
              <option value="IT">IT</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Electrical">Electrical</option>
              <option value="Machine">Machine</option>
              <option value="Civil">Civil</option>
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveCard}
            disabled={isUploading}
            style={{
              backgroundColor: isUploading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {isUploading ? '💾 Saving...' : '💾 Save Business Card'}
          </button>
        </div>

        {/* Right Column - Cards List */}
        <div>
          <h3>Saved Business Cards ({cards.length})</h3>
          
          {cards.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
              <div>No business cards saved yet</div>
              <div style={{ fontSize: '14px', marginTop: '5px' }}>
                Add your first business card using the form on the left
              </div>
            </div>
          ) : (
            <div style={{ 
              maxHeight: '600px', 
              overflowY: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '8px'
            }}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    padding: '15px',
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: 'white'
                  }}
                >
                  {/* Card Image */}
                  <div style={{ marginRight: '15px', flexShrink: 0 }}>
                    <BusinessCardImage 
                      card={card} 
                      size="medium"
                      showPlaceholder={true}
                    />
                  </div>
                  
                  {/* Card Info */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                      {card.name_th || card.name_en || 'Unknown Name'}
                    </h4>
                    
                    {card.company && (
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '3px' }}>
                        🏢 {card.company}
                      </div>
                    )}
                    
                    {card.title && (
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '3px' }}>
                        💼 {card.title}
                      </div>
                    )}
                    
                    {card.email && (
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '3px' }}>
                        📧 {card.email}
                      </div>
                    )}
                    
                    {card.phone_mobile && (
                      <div style={{ color: '#666', fontSize: '14px', marginBottom: '3px' }}>
                        📱 {card.phone_mobile}
                      </div>
                    )}
                    
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      marginTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>📂 {card.category}</span>
                      <span>
                        {card.imageUrl ? '📸 Has Image' : '📄 No Image'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e8f4fd', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <h4>📋 Instructions:</h4>
        <ul>
          <li>📷 Upload a business card image (optional)</li>
          <li>🗜️ Images will be automatically compressed to save storage space</li>
          <li>📡 If offline, images will be queued and uploaded when connection is restored</li>
          <li>💾 Fill in the business card information and click Save</li>
          <li>🔄 Check the status bar above for offline upload progress</li>
          <li>🔧 Use the Debug panel to test Firebase Storage connection</li>
          <li>📋 View saved cards with images in the right panel</li>
        </ul>
      </div>
    </div>
  );
}

export default App;