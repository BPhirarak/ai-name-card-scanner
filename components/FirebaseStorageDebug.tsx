import React, { useState } from 'react';
import { testFirebaseStorage } from '../services/contactService';
import { ImageUploadService } from '../services/imageUploadService';

export const FirebaseStorageDebug: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runStorageTest = async () => {
    setIsLoading(true);
    setTestResult('Testing Firebase Storage connection...');
    
    try {
      const result = await testFirebaseStorage();
      if (result) {
        setTestResult('✅ Firebase Storage connection successful!');
      } else {
        setTestResult('❌ Firebase Storage connection failed!');
      }
    } catch (error) {
      setTestResult(`❌ Firebase Storage test error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testImageUpload = async () => {
    setIsLoading(true);
    setTestResult('Testing image upload...');
    
    try {
      // Create a test image file
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#007bff';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText('TEST', 30, 55);
      }
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });
      
      const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
      
      // Upload test image
      const imageUrl = await ImageUploadService.uploadImage(testFile, 'test-contact');
      
      setTestResult(`✅ Test image uploaded successfully! URL: ${imageUrl}`);
      
      // Clean up test image after 5 seconds
      setTimeout(async () => {
        try {
          await ImageUploadService.deleteImage(imageUrl);
          setTestResult(prev => prev + '\n🗑️ Test image cleaned up successfully');
        } catch (cleanupError) {
          console.warn('Failed to cleanup test image:', cleanupError);
        }
      }, 5000);
      
    } catch (error) {
      setTestResult(`❌ Image upload test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>🔧 Firebase Storage Debug</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={runStorageTest}
          disabled={isLoading}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳ Testing...' : '🧪 Test Storage Connection'}
        </button>
        
        <button
          onClick={testImageUpload}
          disabled={isLoading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳ Testing...' : '📸 Test Image Upload'}
        </button>
      </div>
      
      {testResult && (
        <div style={{
          padding: '10px',
          backgroundColor: testResult.includes('✅') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${testResult.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          {testResult}
        </div>
      )}
      
      <div style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#6c757d' 
      }}>
        <strong>Debug Info:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Firebase Project: namecardreader-7a7d3</li>
          <li>Storage Bucket: namecardreader-7a7d3.appspot.com</li>
          <li>Storage Path: business-cards/</li>
          <li>Check Firebase Console → Storage for uploaded files</li>
        </ul>
      </div>
    </div>
  );
};