import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDMJxaCa9biRxQN7TIsg-XQwtcdyzgHOks",
  authDomain: "namecardreader-7a7d3.firebaseapp.com",
  databaseURL: "https://namecardreader-7a7d3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "namecardreader-7a7d3",
  storageBucket: "namecardreader-7a7d3.appspot.com",
  messagingSenderId: "1036193513751",
  appId: "1:1036193513751:web:06ad5a18d049955e6a3752"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Debug function to test Firebase Storage
export const testFirebaseStorage = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    
    // Import storage functions
    const { ref, uploadBytes, getDownloadURL, deleteObject } = await import("firebase/storage");
    
    // Create a test file
    const testData = new Blob(['test'], { type: 'text/plain' });
    
    // Try to upload and delete
    const testRef = ref(storage, 'test/connection-test.txt');
    await uploadBytes(testRef, testData);
    
    // Get download URL to verify upload
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Test file uploaded:', downloadURL);
    
    // Clean up test file
    await deleteObject(testRef);
    
    console.log('✅ Firebase Storage connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase Storage connection test failed:', error);
    return false;
  }
};