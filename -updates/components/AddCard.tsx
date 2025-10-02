import React, { useState, useRef, useCallback } from 'react';
import { extractInfoFromImage } from '../services/geminiService';
import { testFirebaseStorage } from '../services/contactService';
import EditCardForm from './EditCardForm';
import Spinner from './Spinner';
import type { BusinessCard } from '../types';

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const DebugIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const AddCard: React.FC = () => {
    const [image, setImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
    const [extractedData, setExtractedData] = useState<Omit<BusinessCard, 'id'> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [debugResult, setDebugResult] = useState<string>('');
    const [isTestingStorage, setIsTestingStorage] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    }, []);

    const resetState = () => {
        stopCamera();
        setImage(null);
        setExtractedData(null);
        setIsLoading(false);
        setError(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setImage({ data: base64String, mimeType: file.type, url: URL.createObjectURL(file) });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        resetState();
        fileInputRef.current?.click();
    };

    const startCamera = async () => {
        resetState();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsCameraOn(true);
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please check permissions.");
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg');
            const base64String = dataUrl.split(',')[1];
            setImage({ data: base64String, mimeType: 'image/jpeg', url: dataUrl });
            stopCamera();
        }
    };

    const handleProcess = async () => {
        if (!image) return;
        setIsLoading(true);
        setError(null);
        setExtractedData(null);
        try {
            const data = await extractInfoFromImage(image.data, image.mimeType);
            setExtractedData({ 
                ...data, 
                category: '', 
                createdAt: Date.now(),
                // Store original image data for upload
                originalImageData: image.data,
                originalImageMimeType: image.mimeType
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestStorage = async () => {
        setIsTestingStorage(true);
        setDebugResult('Testing Firebase Storage connection...');
        
        try {
            const result = await testFirebaseStorage();
            if (result) {
                setDebugResult('✅ Firebase Storage connection successful!');
            } else {
                setDebugResult('❌ Firebase Storage connection failed!');
            }
        } catch (error) {
            setDebugResult(`❌ Firebase Storage test error: ${error}`);
        } finally {
            setIsTestingStorage(false);
        }
    };

    if (extractedData) {
        return <EditCardForm initialData={extractedData} onCancel={resetState} />;
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Add New Business Card</h1>
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                    <DebugIcon />
                    {showDebug ? 'Hide Debug' : 'Show Debug'}
                </button>
            </div>

            {/* Debug Panel */}
            {showDebug && (
                <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-slate-200">🔧 Firebase Storage Debug</h3>
                    
                    <button
                        onClick={handleTestStorage}
                        disabled={isTestingStorage}
                        className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isTestingStorage ? (
                            <>
                                <Spinner />
                                Testing...
                            </>
                        ) : (
                            '🧪 Test Storage Connection'
                        )}
                    </button>
                    
                    {debugResult && (
                        <div className={`p-3 rounded-lg text-sm font-mono ${
                            debugResult.includes('✅') 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700' 
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
                        }`}>
                            {debugResult}
                        </div>
                    )}
                    
                    <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                        <strong>Debug Info:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                            <li>Firebase Project: namecardreader-7a7d3</li>
                            <li>Storage Bucket: namecardreader-7a7d3.appspot.com</li>
                            <li>Storage Path: business-cards/</li>
                            <li>Check Firebase Console → Storage for uploaded files</li>
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <button
                    onClick={handleUploadClick}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <UploadIcon />
                    <span className="mt-2 text-sm font-medium">Upload Image</span>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <CameraIcon />
                    <span className="mt-2 text-sm font-medium">Use Camera</span>
                </button>
            </div>

            <div className="mb-6 bg-slate-200 dark:bg-slate-900 rounded-lg min-h-[200px] flex items-center justify-center overflow-hidden">
                {isCameraOn && <video ref={videoRef} className="w-full h-auto max-h-[400px]" />}
                <canvas ref={canvasRef} className="hidden"/>
                {image && !isCameraOn && <img src={image.url} alt="Business card preview" className="max-w-full max-h-[400px] rounded-lg" />}
                {!image && !isCameraOn && <p className="text-slate-500">Image preview will appear here</p>}
            </div>

            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isCameraOn && (
                     <>
                        <button onClick={captureImage} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg">Capture</button>
                        <button onClick={stopCamera} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-all">Cancel</button>
                     </>
                )}

                {image && !isCameraOn && (
                    <>
                        <button onClick={handleProcess} disabled={isLoading} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {isLoading ? <><Spinner /> Processing...</> : 'Process Card'}
                        </button>
                        <button onClick={resetState} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-all">Reset</button>
                    </>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Instructions:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>📷 Upload or capture a business card image</li>
                    <li>🤖 AI will extract contact information automatically</li>
                    <li>📸 Images will be stored in Firebase Storage</li>
                    <li>🔧 Use Debug panel to test Firebase Storage connection</li>
                    <li>💾 Review and save the extracted information</li>
                </ul>
            </div>
        </div>
    );
};

export default AddCard;