import React, { useState, useEffect } from 'react';
import type { BusinessCard, UploadProgress } from '../types';
import { saveCard, saveCategory, listenForCategories } from '../services/contactService';
import Spinner from './Spinner';

interface EditCardFormProps {
    initialData: Omit<BusinessCard, 'id'> | BusinessCard;
    onCancel: () => void;
}

const EditCardForm: React.FC<EditCardFormProps> = ({ initialData, onCancel }) => {
    const [cardData, setCardData] = useState(initialData);
    const [categories, setCategories] = useState<string[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    useEffect(() => {
        const unsubscribe = listenForCategories(setCategories);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Set a default category if none is set and categories are loaded
        if (!cardData.category && categories.length > 0) {
            // Set default to "Machine" if available, otherwise use first category
            const defaultCategory = categories.includes('Machine') ? 'Machine' : categories[0];
            setCardData(prev => ({ ...prev, category: defaultCategory }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setCardData({ ...cardData, [e.target.name]: e.target.value });
    };

    const handleAddCategory = async () => {
        if (newCategory && !categories.includes(newCategory)) {
            await saveCategory(newCategory);
            setCardData(prev => ({...prev, category: newCategory}));
            setNewCategory('');
        }
    };

    const handleUploadProgress = (progress: UploadProgress) => {
        setUploadProgress(progress);
        console.log(`📊 Upload progress: ${progress.percentage}%`);
    };

    const handleSaveToDb = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        setUploadProgress(null);
        
        try {
            console.log('💾 Saving card with image...', { 
                hasImageData: !!cardData.originalImageData,
                cardId: cardData.id 
            });
            
            await saveCard(cardData);
            setSaveSuccess(true);
            
            setTimeout(() => {
                onCancel();
            }, 2000);
        } catch (error) {
            console.error("❌ Failed to save card:", error);
            alert('Failed to save card. Please try again.');
        } finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };

    const handleDownloadVcf = () => {
        // Use English name if available, otherwise Thai name
        const fullName = cardData.name_en || cardData.name_th || 'Unknown';
        
        // Split name into parts (First, Last)
        // For Thai names, we'll use the full name as is
        // For English names, try to split by space
        let firstName = '';
        let lastName = '';
        
        if (cardData.name_en) {
            const nameParts = cardData.name_en.trim().split(/\s+/);
            if (nameParts.length > 1) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            } else {
                firstName = cardData.name_en;
            }
        } else if (cardData.name_th) {
            // For Thai names, use full name as first name
            firstName = cardData.name_th;
        }
        
        // Build phone numbers
        let phoneVcf = '';
        if (cardData.phone_mobile) {
            phoneVcf += `TEL;TYPE=CELL:${cardData.phone_mobile}\n`;
        }
        if (cardData.phone_office) {
            phoneVcf += `TEL;TYPE=WORK,VOICE:${cardData.phone_office}\n`;
        }

        // VCF format with proper N (Name) field
        // N format: LastName;FirstName;MiddleName;Prefix;Suffix
        const vcfContent = `BEGIN:VCARD
VERSION:3.0
N:${lastName};${firstName};;;
FN:${fullName}
ORG:${cardData.company || ''}
TITLE:${cardData.title || ''}
${phoneVcf}EMAIL:${cardData.email || ''}
URL:${cardData.website || ''}
ADR;TYPE=WORK:;;${(cardData.address || '').replace(/\n/g, ';')}
CATEGORIES:${cardData.category || ''}
NOTE:${cardData.name_th ? `Thai Name: ${cardData.name_th}` : ''}
END:VCARD`;

        const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fullName.replace(/\s/g, '_')}.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderInputField = (name: keyof BusinessCard, label: string, type: string = 'text') => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <input
                type={type}
                name={name}
                id={name}
                value={cardData[name] as string || ''}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">Verify & Save Contact</h2>
            
            {/* Image Preview */}
            {cardData.originalImageData && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Business Card Image</h3>
                    <div className="flex justify-center">
                        <img 
                            src={`data:${cardData.originalImageMimeType};base64,${cardData.originalImageData}`}
                            alt="Business card preview" 
                            className="max-w-full max-h-48 rounded-lg border border-slate-300 dark:border-slate-600"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                        📸 This image will be uploaded to Firebase Storage when you save the card
                    </p>
                </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Uploading image...
                        </span>
                        <span className="text-sm text-blue-600 dark:text-blue-300">
                            {uploadProgress.percentage}%
                        </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress.percentage}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('name_en', 'Full Name (English)')}
                {renderInputField('name_th', 'Full Name (Thai)')}
                {renderInputField('company', 'Company')}
                {renderInputField('title', 'Title')}
                {renderInputField('phone_mobile', 'Mobile Phone', 'tel')}
                {renderInputField('phone_office', 'Office Phone', 'tel')}
                {renderInputField('email', 'Email', 'email')}
                {renderInputField('website', 'Website', 'url')}
                <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                    <textarea
                        name="address"
                        id="address"
                        rows={3}
                        value={cardData.address}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                    <select
                        name="category"
                        id="category"
                        value={cardData.category}
                        onChange={handleChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                 <div className="md:col-span-2 flex items-end gap-2">
                    <div className="flex-grow">
                        <label htmlFor="newCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Add New Category</label>
                        <input
                            type="text"
                            name="newCategory"
                            id="newCategory"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                        />
                    </div>
                    <button onClick={handleAddCategory} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-sm font-medium rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">Add</button>
                </div>
            </div>

            {saveSuccess && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg border border-green-300 dark:border-green-700 text-center">
                    ✅ Card saved successfully! Image uploaded to Firebase Storage.
                </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                 <button onClick={handleDownloadVcf} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-all">Download VCF</button>
                <button onClick={onCancel} className="w-full sm:w-auto bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-all">Cancel</button>
                <button 
                    onClick={handleSaveToDb} 
                    disabled={isSaving} 
                    className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <Spinner /> 
                            {uploadProgress ? 'Uploading...' : 'Saving...'}
                        </>
                    ) : (
                        '💾 Save to DB'
                    )}
                </button>
            </div>
        </div>
    );
};

export default EditCardForm;