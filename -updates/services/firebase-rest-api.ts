import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDMJxaCa9biRxQN7TIsg-XQwtcdyzgHOks",
  authDomain: "namecardreader-7a7d3.firebaseapp.com",
  databaseURL: "https://namecardreader-7a7d3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "namecardreader-7a7d3",
  storageBucket: "namecardreader-7a7d3.appspot.com",
  messagingSenderId: "1036193513751",
  appId: "1:1036193513751:web:06ad5a18d049955e6a3752"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const database = getDatabase(app);

// Firebase Storage REST API functions
export class FirebaseStorageAPI {
  private static readonly STORAGE_BASE_URL = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o`;
  private static readonly API_KEY = firebaseConfig.apiKey;

  /**
   * Upload file using REST API to avoid CORS issues
   */
  static async uploadFile(file: File, path: string): Promise<string> {
    try {
      console.log('📤 Uploading file via REST API...', { fileName: file.name, path });

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      const base64Content = base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix

      // Encode path for URL
      const encodedPath = encodeURIComponent(path);
      
      // Upload URL
      const uploadUrl = `${this.STORAGE_BASE_URL}/${encodedPath}?uploadType=media&name=${encodedPath}`;

      console.log('🔗 Upload URL:', uploadUrl);

      // Upload file
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${this.API_KEY}`, // This might not work, we'll try without auth first
        },
        body: this.base64ToBlob(base64Content, file.type)
      });

      if (!response.ok) {
        // Try without Authorization header
        console.log('🔄 Retrying without Authorization header...');
        const retryResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
          },
          body: file
        });

        if (!retryResponse.ok) {
          throw new Error(`Upload failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        const result = await retryResponse.json();
        console.log('✅ Upload successful:', result);

        // Return download URL
        return `${this.STORAGE_BASE_URL}/${encodedPath}?alt=media`;
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);

      // Return download URL
      return `${this.STORAGE_BASE_URL}/${encodedPath}?alt=media`;

    } catch (error) {
      console.error('❌ REST API upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete file using REST API
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      console.log('🗑️ Deleting file via REST API...', path);

      const encodedPath = encodeURIComponent(path);
      const deleteUrl = `${this.STORAGE_BASE_URL}/${encodedPath}`;

      const response = await fetch(deleteUrl, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ File deleted successfully');
    } catch (error) {
      console.error('❌ REST API delete failed:', error);
      throw error;
    }
  }

  /**
   * Test connection using REST API
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase Storage via REST API...');

      // Create a test file
      const testContent = 'test';
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      const testPath = 'test/connection-test.txt';

      // Upload test file
      const downloadUrl = await this.uploadFile(testFile, testPath);
      console.log('✅ Test upload successful:', downloadUrl);

      // Verify file exists by trying to fetch it
      const verifyResponse = await fetch(downloadUrl);
      if (verifyResponse.ok) {
        console.log('✅ Test file verification successful');
      }

      // Clean up test file
      await this.deleteFile(testPath);
      console.log('✅ Test file cleaned up');

      console.log('✅ Firebase Storage REST API test passed');
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage REST API test failed:', error);
      return false;
    }
  }

  /**
   * Convert File to base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert base64 to Blob
   */
  private static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

// Export test function
export const testFirebaseStorage = FirebaseStorageAPI.testConnection;