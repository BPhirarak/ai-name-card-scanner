import { ref, onValue, set, push, remove, off, get } from "firebase/database";
import { database, Base64ImageStorage, testFirebaseStorage } from "./firebase";
import type { BusinessCard } from '../types';

// Helper function to generate unique filename (Firebase path safe)
const generateFileName = (contactId: string, mimeType: string): string => {
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1] || 'jpg';
  // Use underscores instead of dots for Firebase compatibility
  return `${contactId}_${timestamp}_${extension}`;
};

export const saveCard = async (card: BusinessCard): Promise<void> => {
  try {
    console.log('💾 Saving card...', { card, hasImageData: !!(card as any).originalImageData });

    // Generate card ID if not exists
    const cardId = card.id || push(ref(database, 'cards')).key!;
    card.id = cardId;

    // If image data is provided, store it in database
    if ((card as any).originalImageData && (card as any).originalImageMimeType) {
      console.log('📸 Processing image storage...');
      
      try {
        // Convert base64 to File
        const base64Data = (card as any).originalImageData;
        const mimeType = (card as any).originalImageMimeType;
        
        // Create file from base64
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const fileName = generateFileName(cardId, mimeType);
        const imageFile = new File([byteArray], fileName, { type: mimeType });
        
        console.log('📤 Uploading image to database storage...');
        
        // Store image in database
        const imageKey = await Base64ImageStorage.uploadImage(imageFile, cardId);
        
        // Update card with image information
        (card as any).imageUrl = imageKey;
        (card as any).imageFileName = fileName;
        
        console.log('✅ Image stored successfully:', imageKey);
      } catch (uploadError: any) {
        console.warn("⚠️ Image storage failed:", uploadError);
        console.error("Full error:", uploadError);
        // Continue saving card without image
      }
    }

    // Clean up temporary image data before saving to database
    const cardToSave = { ...card };
    delete (cardToSave as any).originalImageData;
    delete (cardToSave as any).originalImageMimeType;

    // Save card data to Firebase Realtime Database
    console.log('💾 Saving card data to database...');
    const cardRef = ref(database, `cards/${cardId}`);
    await set(cardRef, {
      ...cardToSave,
      updatedAt: Date.now()
    });
    
    console.log('✅ Card saved successfully:', cardId);
  } catch (error: any) {
    console.error("❌ Failed to save card:", error);
    throw error;
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting card:', cardId);

    // Get card data first to delete associated image
    const cardRef = ref(database, `cards/${cardId}`);
    const snapshot = await get(cardRef);
    const cardData = snapshot.val() as BusinessCard;
    
    // Delete associated image if exists
    if ((cardData as any)?.imageUrl) {
      try {
        console.log('🗑️ Deleting associated image...');
        await Base64ImageStorage.deleteImage((cardData as any).imageUrl);
        console.log('✅ Associated image deleted');
      } catch (imageDeleteError) {
        console.warn("⚠️ Failed to delete associated image:", imageDeleteError);
      }
    }

    // Delete card data
    await remove(cardRef);
    console.log('✅ Card deleted successfully');
  } catch (error) {
    console.error("❌ Failed to delete card:", error);
    throw error;
  }
};

export const listenForCards = (callback: (cards: BusinessCard[]) => void) => {
  console.log('👂 Setting up cards listener...');
  const cardsRef = ref(database, 'cards');
  
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    const cardList: BusinessCard[] = data ? Object.entries(data).map(([id, card]) => ({
      id,
      ...(card as Omit<BusinessCard, 'id'>),
    })) : [];
    
    // Don't load images here - let CardItem components handle it individually
    // This prevents blocking the UI while loading multiple images
    
    console.log('📋 Cards updated:', cardList.length, 'cards');
    callback(cardList.sort((a, b) => b.createdAt - a.createdAt));
  });
  
  return () => {
    console.log('🔇 Removing cards listener');
    off(cardsRef);
  };
};

export const saveCategory = (category: string): Promise<void> => {
  console.log('📂 Saving category:', category);
  const categoriesRef = ref(database, 'categories');
  const newCategoryRef = push(categoriesRef);
  return set(newCategoryRef, category);
};

export const listenForCategories = (callback: (categories: string[]) => void) => {
  console.log('👂 Setting up categories listener...');
  const categoriesRef = ref(database, 'categories');
  
  onValue(categoriesRef, (snapshot) => {
    const data = snapshot.val();
    const categoryList: string[] = data ? Object.values(data) as string[] : [];
    // Ensure default categories are present and remove duplicates
    const defaultCategories = ["IT", "Mechanical", "Electrical", "Machine", "Civil"];
    const combined = [...new Set([...defaultCategories, ...categoryList])];
    callback(combined.sort());
  });
  
  return () => off(categoriesRef);
};

// Export the test function
export { testFirebaseStorage };

// Alias for backward compatibility
export const saveCardWithImage = saveCard;