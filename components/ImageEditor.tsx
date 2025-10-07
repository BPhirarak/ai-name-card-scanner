import React, { useState, useRef, useEffect, useCallback } from 'react';
import { correctKeystone, type Point } from '../utils/perspectiveTransform';
import { detectBusinessCard } from '../utils/cardDetection';

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
    const [cropDragMode, setCropDragMode] = useState<'none' | 'move' | 'resize'>('none');
    const [resizeHandle, setResizeHandle] = useState<number>(-1);
    const [debugInfo, setDebugInfo] = useState<string>('');

    // Auto-detect business card area using the same algorithm as auto-process
    const autoDetectCardArea = useCallback(async (img: HTMLImageElement) => {
        try {
            // Create canvas for detection
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Use the same detection algorithm
            const detectedCard = await detectBusinessCard(canvas);
            
            if (detectedCard && detectedCard.confidence > 0.3) {
                console.log('🎯 Card detected in ImageEditor with confidence:', detectedCard.confidence);
                return {
                    cropArea: detectedCard.cropArea,
                    corners: detectedCard.corners
                };
            }
        } catch (error) {
            console.warn('Detection failed, using fallback:', error);
        }
        
        // Improved fallback detection with better proportions
        const margin = Math.min(img.width, img.height) * 0.05; // Smaller margin
        const cardWidth = img.width * 0.9; // Larger width coverage
        const cardHeight = img.height * 0.75; // Larger height coverage to avoid cutting bottom
        const x = (img.width - cardWidth) / 2;
        const y = (img.height - cardHeight) / 2;
        
        const cropArea = {
            x: Math.max(margin, x),
            y: Math.max(margin, y),
            width: Math.min(cardWidth, img.width - 2 * margin),
            height: Math.min(cardHeight, img.height - 2 * margin)
        };
        
        const corners: [Point, Point, Point, Point] = [
            { x: cropArea.x, y: cropArea.y },
            { x: cropArea.x + cropArea.width, y: cropArea.y },
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
            { x: cropArea.x, y: cropArea.y + cropArea.height }
        ];
        
        return { cropArea, corners };
    }, []);

    // Load original image
    useEffect(() => {
        const img = new Image();
        img.onload = async () => {
            setOriginalImage(img);
            
            console.log('🎨 ImageEditor loading image:', { width: img.width, height: img.height });
            
            // Initialize keystone points with auto-detected card corners
            const detection = await autoDetectCardArea(img);
            
            console.log('🎨 ImageEditor detection result:', detection);
            
            // Ensure we always have good-sized corners for mobile
            const enhancedCorners = detection.corners.map(corner => ({
                x: Math.max(10, Math.min(img.width - 10, corner.x)),
                y: Math.max(10, Math.min(img.height - 10, corner.y))
            })) as [Point, Point, Point, Point];
            
            setKeystonePoints(enhancedCorners);
            setCropArea(detection.cropArea);
            
            console.log('🎨 ImageEditor initialized with enhanced corners:', enhancedCorners);
        };
        img.src = `data:${imageMimeType};base64,${imageData}`;
    }, [imageData, imageMimeType, autoDetectCardArea]);

    // Apply brightness and contrast manually for better mobile compatibility
    const applyImageFilters = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        // Always use manual method for consistent results across all devices
        ctx.filter = 'none'; // Reset any existing filter
        ctx.drawImage(img, 0, 0);
        
        // Apply manual brightness/contrast if needed
        if (brightness !== 100 || contrast !== 100) {
            const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            const data = imageData.data;
            
            const brightnessFactor = (brightness - 100) / 100; // Convert to -1 to 1 range
            const contrastFactor = contrast / 100;
            
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                
                // Apply brightness (additive)
                r += brightnessFactor * 255;
                g += brightnessFactor * 255;
                b += brightnessFactor * 255;
                
                // Apply contrast (multiplicative around midpoint)
                r = ((r - 128) * contrastFactor) + 128;
                g = ((g - 128) * contrastFactor) + 128;
                b = ((b - 128) * contrastFactor) + 128;
                
                // Clamp values to 0-255 range
                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, b));
            }
            
            ctx.putImageData(imageData, 0, 0);
        }
    };

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

        // Apply rotation
        if (rotation !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Draw image with filters
        if (activeMode === 'keystone' && keystonePoints.length === 4) {
            // Apply keystone correction using perspective transformation
            drawKeystoneImage(ctx, originalImage, keystonePoints);
        } else {
            applyImageFilters(ctx, originalImage);
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
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(area.x, area.y, area.width, area.height);
        ctx.setLineDash([]);
        
        // Calculate handle size based on canvas size
        const canvasSize = Math.min(ctx.canvas.width, ctx.canvas.height);
        const scaleFactor = Math.max(1, canvasSize / 500);
        const handleSize = 30 * scaleFactor; // Scale for canvas size
        ctx.fillStyle = '#00ff00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scaleFactor;
        
        const corners = [
            { x: area.x, y: area.y, label: '↖' },
            { x: area.x + area.width, y: area.y, label: '↗' },
            { x: area.x + area.width, y: area.y + area.height, label: '↘' },
            { x: area.x, y: area.y + area.height, label: '↙' }
        ];
        
        corners.forEach((corner, index) => {
            // Draw touch area (larger invisible area)
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, handleSize, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw visible handle
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, handleSize * 0.6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Draw corner icon
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(corner.label, corner.x, corner.y + 7);
        });
        
        // Draw crop dimensions
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
            `📏 ${Math.round(area.width)} × ${Math.round(area.height)}`,
            area.x + 5,
            area.y - 10
        );
        
        // Draw center move handle
        const centerX = area.x + area.width / 2;
        const centerY = area.y + area.height / 2;
        const centerRadius = 25 * scaleFactor;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.max(16, 16 * scaleFactor)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('✋', centerX, centerY + 5 * scaleFactor);
        
        // Restore state
        ctx.restore();
    };

    const drawKeystonePoints = (ctx: CanvasRenderingContext2D, points: Point[]) => {
        // Calculate scale factor based on canvas size for responsive sizing
        const canvasSize = Math.min(ctx.canvas.width, ctx.canvas.height);
        const scaleFactor = Math.max(1, canvasSize / 500); // Base size for 500px canvas
        
        points.forEach((point, index) => {
            // Scale circles based on canvas size
            const outerRadius = 35 * scaleFactor; // Larger touch area
            const innerRadius = 20 * scaleFactor; // Larger visible area
            const isSelected = selectedCorner === index;
            
            console.log(`🎯 Drawing keystone point ${index}:`, {
                point,
                outerRadius,
                innerRadius,
                scaleFactor,
                canvasSize
            });
            
            // Draw outer circle (touch area indicator)
            ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(point.x, point.y, outerRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw inner circle (visual point)
            ctx.fillStyle = isSelected ? '#ff0000' : '#00ff00';
            ctx.beginPath();
            ctx.arc(point.x, point.y, innerRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw white border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scaleFactor;
            ctx.stroke();
            
            // Draw point label with corner names
            const cornerNames = ['TL', 'TR', 'BR', 'BL'];
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(14, 14 * scaleFactor)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(cornerNames[index], point.x, point.y - 2 * scaleFactor);
            ctx.font = `bold ${Math.max(12, 12 * scaleFactor)}px Arial`;
            ctx.fillText(`${index + 1}`, point.x, point.y + 12 * scaleFactor);
        });
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Get position from mouse or touch event
        let clientX: number, clientY: number;
        
        if ('touches' in e) {
            // Touch event
            const touch = e.touches[0] || e.changedTouches[0];
            if (!touch) return { x: 0, y: 0 };
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            // Mouse event
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        // Get position relative to canvas display size
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        
        // Scale to actual canvas coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = relativeX * scaleX;
        const y = relativeY * scaleY;
        
        // Debug logging for touch events
        if ('touches' in e) {
            const debugMsg = `Touch: (${Math.round(x)}, ${Math.round(y)}) Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`;
            setDebugInfo(debugMsg);
            console.log('👆 Touch coordinates:', {
                client: { x: clientX, y: clientY },
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                canvas: { width: canvas.width, height: canvas.height },
                scale: { x: scaleX, y: scaleY },
                relative: { x: relativeX, y: relativeY },
                final: { x, y }
            });
        }
        
        return { x, y };
    };

    const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        
        e.preventDefault(); // Prevent scrolling on touch

        const { x, y } = getCanvasCoordinates(e);

        if (activeMode === 'crop' && cropArea) {
            // Calculate handle size based on canvas size
            const canvasSize = Math.min(canvasRef.current.width, canvasRef.current.height);
            const scaleFactor = Math.max(1, canvasSize / 500);
            const handleSize = 30 * scaleFactor;
            const centerSize = 25 * scaleFactor;
            
            const corners = [
                { x: cropArea.x, y: cropArea.y },
                { x: cropArea.x + cropArea.width, y: cropArea.y },
                { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
                { x: cropArea.x, y: cropArea.y + cropArea.height }
            ];
            
            console.log('✂️ Crop touch test:', {
                touchPoint: { x, y },
                cropArea,
                corners,
                handleSize,
                scaleFactor
            });
            
            const distances = corners.map((corner, index) => {
                const distance = Math.sqrt((corner.x - x) ** 2 + (corner.y - y) ** 2);
                console.log(`📍 Corner ${index} (${corner.x}, ${corner.y}) distance: ${distance} (handleSize: ${handleSize})`);
                return distance;
            });
            
            const clickedHandle = corners.findIndex(corner => {
                const distance = Math.sqrt((corner.x - x) ** 2 + (corner.y - y) ** 2);
                return distance < handleSize;
            });
            
            if (clickedHandle !== -1) {
                console.log('✅ Crop corner selected:', clickedHandle);
                setCropDragMode('resize');
                setResizeHandle(clickedHandle);
                setIsDragging(true);
                setDragStart({ x, y });
                return;
            }
            
            // Check if touching center (move handle)
            const centerX = cropArea.x + cropArea.width / 2;
            const centerY = cropArea.y + cropArea.height / 2;
            const centerDistance = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2);
            
            console.log('🎯 Center distance:', centerDistance, 'Center:', { x: centerX, y: centerY }, 'centerSize:', centerSize);
            
            if (centerDistance < centerSize) {
                console.log('✅ Crop center selected');
                setCropDragMode('move');
                setIsDragging(true);
                setDragStart({ x, y });
                return;
            }
            
            console.log('❌ No crop handle hit, min distance:', Math.min(...distances));
        } else if (activeMode === 'keystone') {
            // Calculate hit radius based on canvas size
            const canvasSize = Math.min(canvasRef.current.width, canvasRef.current.height);
            const scaleFactor = Math.max(1, canvasSize / 500);
            const hitRadius = 35 * scaleFactor; // Scale hit radius with canvas
            
            console.log('🎯 Keystone touch test:', {
                touchPoint: { x, y },
                keystonePoints,
                hitRadius,
                scaleFactor,
                canvasSize
            });
            
            const distances = keystonePoints.map((point, index) => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                console.log(`📍 Point ${index} (${point.x}, ${point.y}) distance: ${distance} (hitRadius: ${hitRadius})`);
                return distance;
            });
            
            const clickedPoint = keystonePoints.findIndex(point => {
                const distance = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
                return distance < hitRadius;
            });
            
            console.log('🎯 Clicked point:', clickedPoint, 'Min distance:', Math.min(...distances));
            
            if (clickedPoint !== -1) {
                console.log('✅ Keystone point selected:', clickedPoint);
                setSelectedCorner(clickedPoint);
                setIsDragging(true);
                setDragStart({ x, y });
            } else {
                console.log('❌ No keystone point hit');
            }
        }
    };

    const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDragging || !canvasRef.current || !cropArea) return;
        
        e.preventDefault(); // Prevent scrolling on touch

        const { x, y } = getCanvasCoordinates(e);
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;

        if (activeMode === 'crop') {
            if (cropDragMode === 'move') {
                // Move entire crop area
                const newX = Math.max(0, Math.min(originalImage!.width - cropArea.width, cropArea.x + deltaX));
                const newY = Math.max(0, Math.min(originalImage!.height - cropArea.height, cropArea.y + deltaY));
                
                setCropArea({
                    ...cropArea,
                    x: newX,
                    y: newY
                });
                setDragStart({ x, y });
            } else if (cropDragMode === 'resize' && resizeHandle !== -1) {
                // Resize crop area by dragging corners
                const newCropArea = { ...cropArea };
                
                switch (resizeHandle) {
                    case 0: // Top-left
                        newCropArea.width = Math.max(50, cropArea.width - deltaX);
                        newCropArea.height = Math.max(50, cropArea.height - deltaY);
                        newCropArea.x = cropArea.x + deltaX;
                        newCropArea.y = cropArea.y + deltaY;
                        break;
                    case 1: // Top-right
                        newCropArea.width = Math.max(50, cropArea.width + deltaX);
                        newCropArea.height = Math.max(50, cropArea.height - deltaY);
                        newCropArea.y = cropArea.y + deltaY;
                        break;
                    case 2: // Bottom-right
                        newCropArea.width = Math.max(50, cropArea.width + deltaX);
                        newCropArea.height = Math.max(50, cropArea.height + deltaY);
                        break;
                    case 3: // Bottom-left
                        newCropArea.width = Math.max(50, cropArea.width - deltaX);
                        newCropArea.height = Math.max(50, cropArea.height + deltaY);
                        newCropArea.x = cropArea.x + deltaX;
                        break;
                }
                
                // Ensure crop area stays within image bounds
                newCropArea.x = Math.max(0, Math.min(originalImage!.width - newCropArea.width, newCropArea.x));
                newCropArea.y = Math.max(0, Math.min(originalImage!.height - newCropArea.height, newCropArea.y));
                
                setCropArea(newCropArea);
                setDragStart({ x, y });
            }
        } else if (activeMode === 'keystone' && selectedCorner !== -1) {
            const newPoints = [...keystonePoints];
            // Constrain points to image bounds
            const constrainedX = Math.max(0, Math.min(originalImage!.width, x));
            const constrainedY = Math.max(0, Math.min(originalImage!.height, y));
            newPoints[selectedCorner] = { x: constrainedX, y: constrainedY };
            setKeystonePoints(newPoints);
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
        setSelectedCorner(-1);
        setCropDragMode('none');
        setResizeHandle(-1);
    };

    const handleSave = () => {
        if (!originalImage) return;

        console.log('🎨 Starting image save process...', {
            mode: activeMode,
            brightness,
            contrast,
            rotation,
            keystonePoints: keystonePoints.length,
            cropArea
        });

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

        // Apply rotation first
        if (rotation !== 0) {
            sourceCtx.translate(sourceCanvas.width / 2, sourceCanvas.height / 2);
            sourceCtx.rotate((rotation * Math.PI) / 180);
            sourceCtx.translate(-sourceCanvas.width / 2, -sourceCanvas.height / 2);
        }

        // Draw image first
        sourceCtx.drawImage(originalImage, 0, 0);
        sourceCtx.restore();

        // Apply brightness and contrast manually for better compatibility
        if (brightness !== 100 || contrast !== 100) {
            const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            const data = imageData.data;
            
            const brightnessFactor = (brightness - 100) / 100;
            const contrastFactor = contrast / 100;
            
            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i + 1];
                let b = data[i + 2];
                
                // Apply brightness
                r += brightnessFactor * 255;
                g += brightnessFactor * 255;
                b += brightnessFactor * 255;
                
                // Apply contrast
                r = ((r - 128) * contrastFactor) + 128;
                g = ((g - 128) * contrastFactor) + 128;
                b = ((b - 128) * contrastFactor) + 128;
                
                // Clamp values
                data[i] = Math.max(0, Math.min(255, r));
                data[i + 1] = Math.max(0, Math.min(255, g));
                data[i + 2] = Math.max(0, Math.min(255, b));
            }
            
            sourceCtx.putImageData(imageData, 0, 0);
        }

        // Apply keystone correction if needed (proper perspective correction)
        if (activeMode === 'keystone' && keystonePoints.length === 4) {
            try {
                console.log('📐 Applying keystone correction...', keystonePoints);
                
                const [tl, tr, br, bl] = keystonePoints;
                
                // Create output canvas with standard business card proportions
                const outputCanvas = document.createElement('canvas');
                const outputCtx = outputCanvas.getContext('2d');
                if (!outputCtx) throw new Error('Cannot create output canvas');
                
                // Calculate output dimensions based on keystone area
                const width = Math.max(
                    Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2),
                    Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2)
                );
                const height = Math.max(
                    Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2),
                    Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2)
                );
                
                outputCanvas.width = Math.round(width);
                outputCanvas.height = Math.round(height);
                
                console.log('📏 Keystone output size:', { width: outputCanvas.width, height: outputCanvas.height });
                
                // Simple perspective mapping using bilinear interpolation
                const imageData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
                const data = imageData.data;
                
                // Get source image data
                const sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
                const sourceData = sourceImageData.data;
                
                // Map each pixel in output to source using bilinear interpolation
                for (let y = 0; y < outputCanvas.height; y++) {
                    for (let x = 0; x < outputCanvas.width; x++) {
                        // Normalize coordinates (0-1)
                        const u = x / (outputCanvas.width - 1);
                        const v = y / (outputCanvas.height - 1);
                        
                        // Bilinear interpolation of keystone points
                        const top = {
                            x: tl.x + u * (tr.x - tl.x),
                            y: tl.y + u * (tr.y - tl.y)
                        };
                        const bottom = {
                            x: bl.x + u * (br.x - bl.x),
                            y: bl.y + u * (br.y - bl.y)
                        };
                        
                        const sourceX = top.x + v * (bottom.x - top.x);
                        const sourceY = top.y + v * (bottom.y - top.y);
                        
                        // Sample source pixel with bilinear interpolation
                        if (sourceX >= 0 && sourceX < sourceCanvas.width - 1 && 
                            sourceY >= 0 && sourceY < sourceCanvas.height - 1) {
                            
                            const x1 = Math.floor(sourceX);
                            const y1 = Math.floor(sourceY);
                            const x2 = x1 + 1;
                            const y2 = y1 + 1;
                            
                            const fx = sourceX - x1;
                            const fy = sourceY - y1;
                            
                            const outputIdx = (y * outputCanvas.width + x) * 4;
                            
                            for (let c = 0; c < 4; c++) {
                                const p1 = sourceData[(y1 * sourceCanvas.width + x1) * 4 + c];
                                const p2 = sourceData[(y1 * sourceCanvas.width + x2) * 4 + c];
                                const p3 = sourceData[(y2 * sourceCanvas.width + x1) * 4 + c];
                                const p4 = sourceData[(y2 * sourceCanvas.width + x2) * 4 + c];
                                
                                const interpolated = 
                                    p1 * (1 - fx) * (1 - fy) +
                                    p2 * fx * (1 - fy) +
                                    p3 * (1 - fx) * fy +
                                    p4 * fx * fy;
                                
                                data[outputIdx + c] = Math.round(interpolated);
                            }
                        }
                    }
                }
                
                outputCtx.putImageData(imageData, 0, 0);
                sourceCanvas = outputCanvas;
                
                console.log('✅ Perspective correction applied successfully');
            } catch (error) {
                console.warn('❌ Keystone correction failed:', error);
                // Fall back to simple crop
                const [tl, tr, br, bl] = keystonePoints;
                const minX = Math.min(tl.x, tr.x, br.x, bl.x);
                const maxX = Math.max(tl.x, tr.x, br.x, bl.x);
                const minY = Math.min(tl.y, tr.y, br.y, bl.y);
                const maxY = Math.max(tl.y, tr.y, br.y, bl.y);
                
                const cropWidth = maxX - minX;
                const cropHeight = maxY - minY;
                
                if (cropWidth > 0 && cropHeight > 0) {
                    const croppedCanvas = document.createElement('canvas');
                    const croppedCtx = croppedCanvas.getContext('2d');
                    if (croppedCtx) {
                        croppedCanvas.width = cropWidth;
                        croppedCanvas.height = cropHeight;
                        croppedCtx.drawImage(
                            sourceCanvas,
                            minX, minY, cropWidth, cropHeight,
                            0, 0, cropWidth, cropHeight
                        );
                        sourceCanvas = croppedCanvas;
                    }
                }
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
        console.log('💾 Final canvas size:', { width: finalCanvas.width, height: finalCanvas.height });
        
        const dataUrl = finalCanvas.toDataURL(imageMimeType, 0.9);
        const base64Data = dataUrl.split(',')[1];
        
        console.log('✅ Image processing completed, data length:', base64Data.length);
        onSave(base64Data);
    };

    const resetImage = async () => {
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        
        if (originalImage) {
            // Reset to auto-detected values
            const detection = await autoDetectCardArea(originalImage);
            setKeystonePoints(detection.corners);
            setCropArea(detection.cropArea);
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
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                📱 <strong>Mobile:</strong> สัมผัสมุมสีเขียวเพื่อปรับขนาด, สัมผัสกลางเพื่อย้าย<br/>
                                🖱️ <strong>Desktop:</strong> คลิกลากมุมเพื่อปรับขนาด, คลิกกลางเพื่อย้าย
                            </p>
                            {cropArea && (
                                <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                    📏 ขนาด: {Math.round(cropArea.width)} × {Math.round(cropArea.height)} pixels<br/>
                                    📍 ตำแหน่ง: ({Math.round(cropArea.x)}, {Math.round(cropArea.y)})<br/>
                                    💡 <strong>วิธีใช้:</strong> ลากมุม ↖↗↘↙ เพื่อปรับขนาด, ลาก ✋ เพื่อย้าย
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (originalImage) {
                                            const detection = await autoDetectCardArea(originalImage);
                                            setCropArea(detection.cropArea);
                                        }
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                >
                                    🔍 ตรวจจับอัตโนมัติ
                                </button>
                                <button
                                    onClick={() => setCropArea(null)}
                                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                                >
                                    🗑️ ล้างการเลือก
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeMode === 'keystone' && (
                    <div className="md:col-span-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    🎯 <strong>Mobile:</strong> สัมผัสและลากจุดสีเขียวขนาดใหญ่ (TL, TR, BR, BL) เพื่อปรับมุมนามบัตร<br/>
                                    🖱️ <strong>Desktop:</strong> คลิกและลากจุดสีเขียวเพื่อปรับมุม
                                </p>
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    💡 <strong>คำแนะนำ:</strong> จุดควบคุมมีขนาดใหญ่พิเศษสำหรับ mobile<br/>
                                    📍 TL=บนซ้าย, TR=บนขวา, BR=ล่างขวา, BL=ล่างซ้าย
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (originalImage) {
                                            const detection = await autoDetectCardArea(originalImage);
                                            setKeystonePoints(detection.corners);
                                            setCropArea(detection.cropArea);
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
            <div className="mb-4 flex flex-col items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-4 overflow-auto">
                {debugInfo && (
                    <div className="mb-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded">
                        🐛 Debug: {debugInfo}
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    // Mouse events
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    // Touch events
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    onTouchCancel={handleEnd}
                    className="max-w-full max-h-96 border border-gray-300 dark:border-gray-600 cursor-crosshair shadow-lg touch-none"
                    style={{ 
                        imageRendering: 'auto',
                        maxWidth: '100%',
                        height: 'auto',
                        touchAction: 'none' // Prevent default touch behaviors
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