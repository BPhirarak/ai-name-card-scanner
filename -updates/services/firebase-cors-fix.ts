import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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
export const storage = getStorage(app);

// Debug function to test Firebase Storage with better error handling
export const testFirebaseStorage = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    
    // Import storage functions
    const { ref, uploadBytes, getDownloadURL, deleteObject } = await import("firebase/storage");
    
    // Create a test file
    const testData = new Blob(['test'], { type: 'text/plain' });
    
    // Try to upload
    const testRef = ref(storage, 'test/connection-test.txt');
    console.log('📤 Attempting upload to:', testRef.fullPath);
    
    const snapshot = await uploadBytes(testRef, testData);
    console.log('✅ Upload successful, snapshot:', snapshot.metadata);
    
    // Get download URL to verify upload
    const downloadURL = await getDownloadURL(testRef);
    console.log('🔗 Download URL obtained:', downloadURL);
    
    // Clean up test file
    await deleteObject(testRef);
    console.log('🗑️ Test file cleaned up');
    
    console.log('✅ Firebase Storage connection test passed');
    return true;
  } catch (error: any) {
    console.error('❌ Firebase Storage connection test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // Check for specific error types
    if (error.code === 'storage/unauthorized') {
      console.error('🔒 Storage rules may be too restrictive');
    } else if (error.code === 'storage/cors-error') {
      console.error('🌐 CORS error - check Firebase Storage CORS configuration');
    } else if (error.code === 'storage/unknown') {
      console.error('❓ Unknown storage error - check Firebase project configuration');
    }
    
    return false;
  }
};

// Function to check Firebase project status
export const checkFirebaseProject = async (): Promise<void> => {
  try {
    console.log('🔍 Checking Firebase project configuration...');
    console.log('Project ID:', firebaseConfig.projectId);
    console.log('Storage Bucket:', firebaseConfig.storageBucket);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    
    // Test database connection
    const { ref: dbRef, get } = await import("firebase/database");
    const testDbRef = dbRef(database, '.info/connected');
    const snapshot = await get(testDbRef);
    console.log('📊 Database connected:', snapshot.val());
    
  } catch (error) {
    console.error('❌ Firebase project check failed:', error);
  }
};