// Business card detection and auto-cropping utilities

export interface DetectedCard {
    corners: [Point, Point, Point, Point]; // TL, TR, BR, BL
    confidence: number;
    cropArea: { x: number; y: number; width: number; height: number };
}

export interface Point {
    x: number;
    y: number;
}

// Edge detection using simple gradient analysis
function detectEdges(imageData: ImageData): number[][] {
    const { data, width, height } = imageData;
    const edges: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
    
    // Sobel edge detection
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    
                    gx += gray * sobelX[ky + 1][kx + 1];
                    gy += gray * sobelY[ky + 1][kx + 1];
                }
            }
            
            edges[y][x] = Math.sqrt(gx * gx + gy * gy);
        }
    }
    
    return edges;
}

// Find rectangular contours in edge image
function findRectangularContours(edges: number[][], threshold: number = 50): Point[][] {
    const height = edges.length;
    const width = edges[0].length;
    const contours: Point[][] = [];
    
    // Simple rectangle detection by finding strong horizontal and vertical lines
    const horizontalLines: { y: number; x1: number; x2: number; strength: number }[] = [];
    const verticalLines: { x: number; y1: number; y2: number; strength: number }[] = [];
    
    // Detect horizontal lines
    for (let y = 0; y < height; y++) {
        let lineStart = -1;
        let lineStrength = 0;
        
        for (let x = 0; x < width; x++) {
            if (edges[y][x] > threshold) {
                if (lineStart === -1) lineStart = x;
                lineStrength += edges[y][x];
            } else {
                if (lineStart !== -1 && x - lineStart > width * 0.1) {
                    horizontalLines.push({
                        y,
                        x1: lineStart,
                        x2: x - 1,
                        strength: lineStrength / (x - lineStart)
                    });
                }
                lineStart = -1;
                lineStrength = 0;
            }
        }
    }
    
    // Detect vertical lines
    for (let x = 0; x < width; x++) {
        let lineStart = -1;
        let lineStrength = 0;
        
        for (let y = 0; y < height; y++) {
            if (edges[y][x] > threshold) {
                if (lineStart === -1) lineStart = y;
                lineStrength += edges[y][x];
            } else {
                if (lineStart !== -1 && y - lineStart > height * 0.1) {
                    verticalLines.push({
                        x,
                        y1: lineStart,
                        y2: y - 1,
                        strength: lineStrength / (y - lineStart)
                    });
                }
                lineStart = -1;
                lineStrength = 0;
            }
        }
    }
    
    // Sort lines by strength
    horizontalLines.sort((a, b) => b.strength - a.strength);
    verticalLines.sort((a, b) => b.strength - a.strength);
    
    // Try to form rectangles from strongest lines
    for (let i = 0; i < Math.min(4, horizontalLines.length); i++) {
        for (let j = i + 1; j < Math.min(4, horizontalLines.length); j++) {
            for (let k = 0; k < Math.min(4, verticalLines.length); k++) {
                for (let l = k + 1; l < Math.min(4, verticalLines.length); l++) {
                    const h1 = horizontalLines[i];
                    const h2 = horizontalLines[j];
                    const v1 = verticalLines[k];
                    const v2 = verticalLines[l];
                    
                    // Check if lines can form a rectangle
                    const rect = formRectangle(h1, h2, v1, v2);
                    if (rect && isValidBusinessCard(rect, width, height)) {
                        contours.push(rect);
                    }
                }
            }
        }
    }
    
    return contours;
}

function formRectangle(
    h1: { y: number; x1: number; x2: number },
    h2: { y: number; x1: number; x2: number },
    v1: { x: number; y1: number; y2: number },
    v2: { x: number; y1: number; y2: number }
): Point[] | null {
    // Ensure proper ordering
    const top = Math.min(h1.y, h2.y);
    const bottom = Math.max(h1.y, h2.y);
    const left = Math.min(v1.x, v2.x);
    const right = Math.max(v1.x, v2.x);
    
    // Check if lines intersect properly
    const width = right - left;
    const height = bottom - top;
    
    if (width < 50 || height < 30) return null;
    
    return [
        { x: left, y: top },     // TL
        { x: right, y: top },    // TR
        { x: right, y: bottom }, // BR
        { x: left, y: bottom }   // BL
    ];
}

function isValidBusinessCard(corners: Point[], imageWidth: number, imageHeight: number): boolean {
    const [tl, tr, br, bl] = corners;
    
    // Calculate dimensions
    const width = Math.max(tr.x - tl.x, br.x - bl.x);
    const height = Math.max(bl.y - tl.y, br.y - tr.y);
    
    // Business card aspect ratio is typically 1.6:1 (85.6mm x 53.98mm)
    const aspectRatio = width / height;
    const expectedRatio = 1.6;
    const ratioTolerance = 0.5;
    
    // Check aspect ratio
    if (Math.abs(aspectRatio - expectedRatio) > ratioTolerance) {
        return false;
    }
    
    // Check minimum size (at least 20% of image)
    const minArea = imageWidth * imageHeight * 0.1;
    const cardArea = width * height;
    
    if (cardArea < minArea) {
        return false;
    }
    
    // Check maximum size (at most 90% of image)
    const maxArea = imageWidth * imageHeight * 0.9;
    if (cardArea > maxArea) {
        return false;
    }
    
    return true;
}

// Main function to detect business card in image
export async function detectBusinessCard(canvas: HTMLCanvasElement): Promise<DetectedCard | null> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    try {
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect edges
        const edges = detectEdges(imageData);
        
        // Find rectangular contours
        const contours = findRectangularContours(edges);
        
        if (contours.length === 0) {
            // Fallback: use center-based detection
            return detectCardFallback(canvas.width, canvas.height);
        }
        
        // Score contours and pick the best one
        let bestContour = contours[0];
        let bestScore = scoreContour(bestContour, canvas.width, canvas.height);
        
        for (let i = 1; i < contours.length; i++) {
            const score = scoreContour(contours[i], canvas.width, canvas.height);
            if (score > bestScore) {
                bestScore = score;
                bestContour = contours[i];
            }
        }
        
        // Convert to crop area
        const [tl, tr, br, bl] = bestContour;
        const cropArea = {
            x: Math.min(tl.x, bl.x),
            y: Math.min(tl.y, tr.y),
            width: Math.max(tr.x, br.x) - Math.min(tl.x, bl.x),
            height: Math.max(bl.y, br.y) - Math.min(tl.y, tr.y)
        };
        
        return {
            corners: bestContour as [Point, Point, Point, Point],
            confidence: bestScore,
            cropArea
        };
        
    } catch (error) {
        console.warn('Card detection failed, using fallback:', error);
        return detectCardFallback(canvas.width, canvas.height);
    }
}

function scoreContour(contour: Point[], imageWidth: number, imageHeight: number): number {
    const [tl, tr, br, bl] = contour;
    
    // Calculate dimensions
    const width = Math.max(tr.x - tl.x, br.x - bl.x);
    const height = Math.max(bl.y - tl.y, br.y - tr.y);
    const aspectRatio = width / height;
    
    // Score based on aspect ratio (business card is ~1.6:1)
    const aspectScore = 1 - Math.abs(aspectRatio - 1.6) / 1.6;
    
    // Score based on size (prefer medium-sized rectangles)
    const area = width * height;
    const imageArea = imageWidth * imageHeight;
    const areaRatio = area / imageArea;
    const sizeScore = areaRatio > 0.1 && areaRatio < 0.8 ? 1 : 0.5;
    
    // Score based on position (prefer center)
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const contourCenterX = (tl.x + tr.x + br.x + bl.x) / 4;
    const contourCenterY = (tl.y + tr.y + br.y + bl.y) / 4;
    
    const centerDistance = Math.sqrt(
        Math.pow(contourCenterX - centerX, 2) + Math.pow(contourCenterY - centerY, 2)
    );
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    const positionScore = 1 - (centerDistance / maxDistance);
    
    return (aspectScore * 0.5 + sizeScore * 0.3 + positionScore * 0.2);
}

function detectCardFallback(imageWidth: number, imageHeight: number): DetectedCard {
    // Fallback: assume card is in center with standard proportions
    const cardWidth = Math.min(imageWidth * 0.8, imageHeight * 0.8 * 1.6);
    const cardHeight = cardWidth / 1.6;
    
    const x = (imageWidth - cardWidth) / 2;
    const y = (imageHeight - cardHeight) / 2;
    
    const corners: [Point, Point, Point, Point] = [
        { x, y },                           // TL
        { x: x + cardWidth, y },           // TR
        { x: x + cardWidth, y: y + cardHeight }, // BR
        { x, y: y + cardHeight }           // BL
    ];
    
    return {
        corners,
        confidence: 0.5,
        cropArea: { x, y, width: cardWidth, height: cardHeight }
    };
}

// Auto-crop and perspective correct the detected card
export function autoProcessCard(
    originalCanvas: HTMLCanvasElement,
    detectedCard: DetectedCard
): HTMLCanvasElement {
    const { corners, cropArea } = detectedCard;
    
    // Create output canvas with standard business card proportions
    const outputCanvas = document.createElement('canvas');
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return originalCanvas;
    
    // Standard business card size (scaled to reasonable pixel size)
    const standardWidth = 400;
    const standardHeight = 250;
    
    outputCanvas.width = standardWidth;
    outputCanvas.height = standardHeight;
    
    // Simple perspective correction by mapping to rectangle
    // For more accurate results, you could use the perspective transform utility
    
    try {
        // Use crop area for now (simpler and more reliable)
        outputCtx.drawImage(
            originalCanvas,
            cropArea.x, cropArea.y, cropArea.width, cropArea.height,
            0, 0, standardWidth, standardHeight
        );
        
        // Apply some enhancement
        const imageData = outputCtx.getImageData(0, 0, standardWidth, standardHeight);
        enhanceBusinessCard(imageData);
        outputCtx.putImageData(imageData, 0, 0);
        
        return outputCanvas;
    } catch (error) {
        console.warn('Auto-processing failed:', error);
        return originalCanvas;
    }
}

function enhanceBusinessCard(imageData: ImageData) {
    const { data } = imageData;
    
    // Apply slight contrast and brightness enhancement
    const brightness = 1.1;
    const contrast = 1.2;
    
    for (let i = 0; i < data.length; i += 4) {
        // Apply brightness
        data[i] *= brightness;     // Red
        data[i + 1] *= brightness; // Green
        data[i + 2] *= brightness; // Blue
        
        // Apply contrast
        data[i] = ((data[i] - 128) * contrast) + 128;
        data[i + 1] = ((data[i + 1] - 128) * contrast) + 128;
        data[i + 2] = ((data[i + 2] - 128) * contrast) + 128;
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, data[i]));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }
}