import React, { useState, useRef, useCallback } from 'react';
import { extractInfoFromImage } from '../services/geminiService';
import { detectBusinessCard, autoProcessCard } from '../utils/cardDetection';
import EditCardForm from './EditCardForm';
import ImageEditor from './ImageEditor';
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

interface AddCardProps {
    currentUser: string;
}

const AddCard: React.FC<AddCardProps> = ({ currentUser }) => {
    const [image, setImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
    const [extractedData, setExtractedData] = useState<Omit<BusinessCard, 'id'> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const [autoProcessed, setAutoProcessed] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

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
        setShowImageEditor(false);
        setIsAutoProcessing(false);
        setAutoProcessed(false);
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

    const handleCameraClick = () => {
        resetState();
        // On mobile, use file input with camera capture
        if (cameraInputRef.current) {
            cameraInputRef.current.click();
        }
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
            setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต");
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

    const handleEditImage = () => {
        if (!image) return;
        setShowImageEditor(true);
    };

    const handleImageEditorSave = (editedImageData: string) => {
        if (!image) return;
        setImage({
            ...image,
            data: editedImageData,
            url: `data:${image.mimeType};base64,${editedImageData}`
        });
        setShowImageEditor(false);
    };

    const handleAutoProcess = async () => {
        if (!image) return;
        
        setIsAutoProcessing(true);
        setError(null);
        
        try {
            // Create canvas from image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = `data:${image.mimeType};base64,${image.data}`;
            });
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Detect business card
            const detectedCard = await detectBusinessCard(canvas);
            
            if (detectedCard) {
                console.log('Card detected with confidence:', detectedCard.confidence);
                
                // Auto-process the card
                const processedCanvas = autoProcessCard(canvas, detectedCard);
                
                // Convert back to base64
                const dataUrl = processedCanvas.toDataURL(image.mimeType, 0.9);
                const base64Data = dataUrl.split(',')[1];
                
                // Update image with processed version
                setImage({
                    ...image,
                    data: base64Data,
                    url: dataUrl
                });
                
                // Mark as auto-processed so user can see the result
                setAutoProcessed(true);
            } else {
                throw new Error('ไม่สามารถตรวจจับนามบัตรได้ กรุณาลองแก้ไขด้วยตนเอง');
            }
        } catch (err) {
            console.error('Auto-processing failed:', err);
            setError((err as Error).message);
        } finally {
            setIsAutoProcessing(false);
        }
    };

    const handleProcessWithData = async (imageData: string) => {
        setIsLoading(true);
        setError(null);
        setExtractedData(null);
        
        try {
            const data = await extractInfoFromImage(imageData, image!.mimeType);
            const cardData = { 
                ...data, 
                category: '', 
                createdAt: Date.now(),
                createdBy: currentUser
            };
            
            // Add image data for storage
            (cardData as any).originalImageData = imageData;
            (cardData as any).originalImageMimeType = image!.mimeType;
            
            setExtractedData(cardData);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!image) return;
        await handleProcessWithData(image.data);
    };

    if (extractedData) {
        return <EditCardForm initialData={extractedData} onCancel={resetState} />;
    }

    if (showImageEditor && image) {
        return (
            <ImageEditor
                imageData={image.data}
                imageMimeType={image.mimeType}
                onSave={handleImageEditorSave}
                onCancel={() => setShowImageEditor(false)}
            />
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">เพิ่มนามบัตร</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <button
                    onClick={handleUploadClick}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <UploadIcon />
                    <span className="mt-2 text-sm font-medium">อัพโหลดรูปภาพ</span>
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                <button
                    onClick={handleCameraClick}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <CameraIcon />
                    <span className="mt-2 text-sm font-medium">ถ่ายภาพ</span>
                </button>
                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    ref={cameraInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
            </div>

            <div className="mb-6 bg-slate-200 dark:bg-slate-900 rounded-lg min-h-[200px] flex items-center justify-center overflow-hidden">
                {isCameraOn && <video ref={videoRef} className="w-full h-auto max-h-[400px]" />}
                <canvas ref={canvasRef} className="hidden"/>
                {image && !isCameraOn && <img src={image.url} alt="Business card preview" className="max-w-full max-h-[400px] rounded-lg" />}
                {!image && !isCameraOn && <p className="text-slate-500">ตัวอย่างรูปภาพจะแสดงที่นี่</p>}
            </div>

            {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isCameraOn && (
                     <>
                        <button onClick={captureImage} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg">ถ่ายภาพ</button>
                        <button onClick={stopCamera} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-all">ยกเลิก</button>
                     </>
                )}

                {image && !isCameraOn && (
                    <>
                        {!autoProcessed ? (
                            <>
                                <button 
                                    onClick={handleAutoProcess} 
                                    disabled={isAutoProcessing || isLoading} 
                                    className="w-full sm:w-auto bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAutoProcessing ? (
                                        <><Spinner /> กำลังตรวจจับและปรับแต่ง...</>
                                    ) : (
                                        '🤖 ตรวจจับและปรับแต่งอัตโนมัติ'
                                    )}
                                </button>
                                <button onClick={handleEditImage} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                    🎨 แก้ไขด้วยตนเอง
                                </button>
                                <button onClick={handleProcess} disabled={isLoading} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isLoading ? <><Spinner /> กำลังประมวลผล...</> : 'ประมวลผลตามต้นฉบับ'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-full p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                                    <p className="text-green-800 dark:text-green-200 text-center font-medium">
                                        ✅ ตรวจจับและปรับแต่งเสร็จแล้ว! ตรวจสอบรูปภาพด้านบนแล้วกดประมวลผลเพื่อดึงข้อมูล
                                    </p>
                                </div>
                                <button onClick={handleProcess} disabled={isLoading} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-all shadow-lg disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isLoading ? <><Spinner /> กำลังประมวลผล...</> : '🧠 ประมวลผลด้วย AI'}
                                </button>
                                <button onClick={handleEditImage} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                    🎨 แก้ไขเพิ่มเติม
                                </button>
                            </>
                        )}
                        <button onClick={resetState} className="w-full sm:w-auto bg-slate-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-all">รีเซ็ต</button>
                    </>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 วิธีใช้งาน:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>📷 อัพโหลดหรือถ่ายภาพนามบัตร</li>
                    <li>🤖 <strong>แนะนำ:</strong> ใช้ "ตรวจจับและปรับแต่งอัตโนมัติ" สำหรับ mobile</li>
                    <li>🎨 หรือแก้ไขด้วยตนเอง: ตัด, หมุน, ปรับแสง, แก้มุมเอียง</li>
                    <li>🧠 AI จะดึงข้อมูลติดต่อออกมาอัตโนมัติ</li>
                    <li>✏️ ตรวจสอบและแก้ไขข้อมูลก่อนบันทึก</li>
                    <li>💾 รูปภาพจะถูกเก็บใน Firebase Database</li>
                </ul>
                
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                    <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🚀 ฟีเจอร์ใหม่: Auto Detection</h5>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                        <strong>ขั้นตอน 1:</strong> ระบบตรวจจับนามบัตร ตัดขอบ และปรับแต่งอัตโนมัติ<br/>
                        <strong>ขั้นตอน 2:</strong> ตรวจสอบผลลัพธ์แล้วกด "ประมวลผลด้วย AI" เพื่อดึงข้อมูล
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AddCard;