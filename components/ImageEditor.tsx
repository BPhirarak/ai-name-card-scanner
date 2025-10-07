import React, { useState, useRef, useEffect, useCallback } from 'react';
import { correctKeystone, type Point } from '../utils/perspectiveTransform';

interface ImageEditorProps {
    imageData: string;
    imageMimeType: string;
    onSave: (editedImageData: string) => void;
    onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageData, imageMimeType, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [rotation, setRotation] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
    const [keystonePoints, setKeystonePoints] = useState<Point[]>([]);
    const [activeMode, setActiveMode] = useState<'crop' | 'keystone' | 'adjust'>('adjust');
    const [selectedCorner, setSelectedCorner] = useState<number>(-1);

    // Load original image
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            // Initialize keystone points as rectangle corners
            const points = [
                { x: 0, y: 0 }, // top-left
                { x: img.width, y: 0 }, // top-right
                { x: img.width, y: img.height }, // bottom-right
                { x: 0, y: img.height } // bottom-left
            ];
            setKeystonePoints(points);
        };
        img.src = `data:${imageMimeType};base64,${imageData}`;
    }, [imageData, imageMimeType]);

    // Redraw canvas when parameters change
    const redrawCanvas = useCallback(() => {
        if (!originalImage || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();

        // Apply brightness and contrast
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        // Apply rotation
        if (rotation !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Draw image
        if (activeMode === 'keystone' && keystonePoints.length === 4) {
            // Apply keystone correction using perspective transformation
            drawKeystoneImage(ctx, originalImage, keystonePoints);
        } else {
            ctx.drawImage(originalImage, 0, 0);
        }

        ctx.restore();

        // Draw crop overlay
        if (activeMode === 'crop' && cropArea) {
            drawCropOverlay(ctx, cropArea);
        }

        // Draw keystone points
        if (activeMode === 'keystone') {
            drawKeystonePoints(ctx, keystonePoints);
        }
    }, [originalImage, rotation, brightness, contrast, cropArea, activeMode, keystonePoints]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    const drawKeystoneImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, points: Point[]) => {
        const [tl, tr, br, bl] = points;
        
        // Draw the original image first
        ctx.drawImage(img, 0, 0);
        
        // Draw the keystone outline
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw corner labels
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('1', tl.x - 10, tl.y - 10);
        ctx.fillText('2', tr.x + 5, tr.y - 10);
        ctx.fillText('3', br.x + 5, br.y + 20);
        ctx.fillText('4', bl.x - 10, bl.y + 20);
    };

    const drawCropOverlay = (ctx: CanvasRenderingContext2D, area: { x: number; y: number; width: number; height: number }) => {
        // Save current state
        ctx.save();
        
        // Draw dark overlay on entire canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Use composite operation to "cut out" the crop area
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(area.x, area.y, area.width, area.height);
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw crop border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(area.x, area.y, area.width, area.height);
        ctx.setLineDash([]);
        
        // Draw corner handles
        const handleSize = 12;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        const corners = [
            { x: area.x, y: area.y },
            { x: area.x + area.width, y: area.y },
            { x: area.x + area.width, y: area.y + area.height },
            { x: area.x, y: area.y + area.height }
        ];
        
        corners.forEach(corner => {
            ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
            ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
        });
        
        // Draw crop dimensions
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(
            `${Math.round(area.width)} × ${Math.round(area.height)}`,
            area.x + 5,
            area.y - 5
        );
        
        // Restore state
        ctx.restore();
    };

    const drawKeystonePoints = (ctx: CanvasRenderingContext2D, points: Point[]) => {
        points.forEach((point, index) => {
            ctx.fillStyle = selectedCorner === index ? '#ff0000' : '#00ff00';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw point label
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText(`${index + 1}`, point.x - 4, point.y + 4);
        });
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate scale factors
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Get mouse position relative to canvas and scale to actual canvas coordinates
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        return { x, y };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;

        const { x, y } = getCanvasCoordinates(e);

        if (activeMode === 'crop') {
            setIsDragging(true);
            setDragStart({ x, y });
            setCropArea({ x, y, width: 0, height: 0 });
        } else if (activeMode === 'keystone') {
            // Check if clicking on a keystone point
            const clickedPoint = keystonePoints.findIndex(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                return distance < 20; // Increased hit area
            });
            
            if (clickedPoint !== -1) {
                setSelectedCorner(clickedPoint);
                setIsDragging(true);
            }
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging || !canvasRef.current) return;

        const { x, y } = getCanvasCoordinates(e);

        if (activeMode === 'crop' && cropArea) {
            const width = x - dragStart.x;
            const height = y - dragStart.y;
            setCropArea({
                x: width < 0 ? x : dragStart.x,
                y: height < 0 ? y : dragStart.y,
                width: Math.abs(width),
                height: Math.abs(height)
            });
        } else if (activeMode === 'keystone' && selectedCorner !== -1) {
            const newPoints = [...keystonePoints];
            newPoints[selectedCorner] = { x, y };
            setKeystonePoints(newPoints);
        }
    };

    const handleCanvasMouseUp = () => {
        setIsDragging(false);
        setSelectedCorner(-1);
    };

    const handleSave = () => {
        if (!originalImage) return;

        // Create a new canvas for final processing
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return;

        let sourceCanvas = document.createElement('canvas');
        let sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) return;

        // Set up source canvas with original image
        sourceCanvas.width = originalImage.width;
        sourceCanvas.height = originalImage.height;

        // Apply all transformations to source canvas
        sourceCtx.save();

        // Apply brightness and contrast
        sourceCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

        // Apply rotation
        if (rotation !== 0) {
            sourceCtx.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
            sourceCtx.rotate((rotation * Math.PI) / 180);
            sourceCtx.translate(-sourceCanvas.width / 2, -sourceCanvas.height / 2);
        }

        sourceCtx.drawImage(originalImage, 0, 0);
        sourceCtx.restore();

        // Apply keystone correction if needed
        if (activeMode === 'keystone' && keystonePoints.length === 4) {
            try {
                sourceCanvas = correctKeystone(
                    sourceCanvas, 
                    originalImage, 
                    keystonePoints as [Point, Point, Point, Point]
                );
            } catch (error) {
                console.warn('Keystone correction failed, using transformed image:', error);
            }
        }

        // Apply cropping if needed
        if (activeMode === 'crop' && cropArea && cropArea.width > 0 && cropArea.height > 0) {
            finalCanvas.width = cropArea.width;
            finalCanvas.height = cropArea.height;
            finalCtx.drawImage(
                sourceCanvas,
                cropArea.x, cropArea.y, cropArea.width, cropArea.height,
                0, 0, cropArea.width, cropArea.height
            );
        } else {
            // Use the full transformed image
            finalCanvas.width = sourceCanvas.width;
            finalCanvas.height = sourceCanvas.height;
            finalCtx.drawImage(sourceCanvas, 0, 0);
        }

        // Convert to base64
        const dataUrl = finalCanvas.toDataURL(imageMimeType, 0.9);
        const base64Data = dataUrl.split(',')[1];
        onSave(base64Data);
    };

    const resetImage = () => {
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setCropArea(null);
        if (originalImage) {
            const points = [
                { x: 0, y: 0 },
                { x: originalImage.width, y: 0 },
                { x: originalImage.width, y: originalImage.height },
                { x: 0, y: originalImage.height }
            ];
            setKeystonePoints(points);
        }
    };

    if (!originalImage) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading image editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">แก้ไขรูปภาพ</h2>
            
            {/* Mode Selection */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setActiveMode('adjust')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                        activeMode === 'adjust' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                >
                    🎨 ปรับแต่ง
                </button>
                <button
                    onClick={() => setActiveMode('crop')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                        activeMode === 'crop' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                >
                    ✂️ ตัดรูป
                </button>
                <button
                    onClick={() => setActiveMode('keystone')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                        activeMode === 'keystone' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                >
                    📐 แก้มุม
                </button>
            </div>

            {/* Controls */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeMode === 'adjust' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-2">หมุน: {rotation}°</label>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full mb-2"
                            />
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setRotation(rotation - 90)}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    ↺ 90°
                                </button>
                                <button
                                    onClick={() => setRotation(rotation + 90)}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    ↻ 90°
                                </button>
                                <button
                                    onClick={() => setRotation(0)}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    0°
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">ความสว่าง: {brightness}%</label>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                value={brightness}
                                onChange={(e) => setBrightness(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">คอนทราสต์: {contrast}%</label>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                value={contrast}
                                onChange={(e) => setContrast(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </>
                )}
                
                {activeMode === 'crop' && (
                    <div className="md:col-span-3">
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                🖱️ คลิกและลากเพื่อเลือกพื้นที่ที่ต้องการตัด
                            </p>
                            {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    📏 พื้นที่ที่เลือก: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} pixels
                                    <br />
                                    📍 ตำแหน่ง: ({Math.round(cropArea.x)}, {Math.round(cropArea.y)})
                                </div>
                            )}
                            <button
                                onClick={() => setCropArea(null)}
                                className="self-start px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                            >
                                🗑️ ล้างการเลือก
                            </button>
                        </div>
                    </div>
                )}
                
                {activeMode === 'keystone' && (
                    <div className="md:col-span-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                🎯 คลิกและลากจุดสีเขียวเพื่อปรับมุมของนามบัตร (แก้ keystone distortion)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (originalImage) {
                                            // Auto-detect business card corners (simplified)
                                            const margin = Math.min(originalImage.width, originalImage.height) * 0.1;
                                            setKeystonePoints([
                                                { x: margin, y: margin },
                                                { x: originalImage.width - margin, y: margin },
                                                { x: originalImage.width - margin, y: originalImage.height - margin },
                                                { x: margin, y: originalImage.height - margin }
                                            ]);
                                        }
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                >
                                    🔍 ตรวจจับอัตโนมัติ
                                </button>
                                <button
                                    onClick={() => {
                                        // Auto-enhance for business cards
                                        setBrightness(110);
                                        setContrast(120);
                                    }}
                                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                                >
                                    ✨ ปรับแต่งอัตโนมัติ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Canvas */}
            <div className="mb-4 flex justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-4 overflow-auto">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="max-w-full max-h-96 border border-gray-300 dark:border-gray-600 cursor-crosshair shadow-lg"
                    style={{ 
                        imageRendering: 'auto',
                        maxWidth: '100%',
                        height: 'auto'
                    }}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <button
                    onClick={resetImage}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                    🔄 รีเซ็ต
                </button>
                
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        ✅ ใช้รูปนี้
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;