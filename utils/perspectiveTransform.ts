// Utility functions for perspective transformation

export interface Point {
    x: number;
    y: number;
}

export interface Matrix {
    a: number; b: number; c: number;
    d: number; e: number; f: number;
    g: number; h: number; i: number;
}

// Calculate perspective transformation matrix from 4 corner points
export function getPerspectiveTransform(
    src: [Point, Point, Point, Point],
    dst: [Point, Point, Point, Point]
): Matrix {
    const [s1, s2, s3, s4] = src;
    const [d1, d2, d3, d4] = dst;

    // Solve for the transformation matrix using the 8-point algorithm
    // This is a simplified version - for production use, consider using a library like ml-matrix
    
    const A = [
        [s1.x, s1.y, 1, 0, 0, 0, -d1.x * s1.x, -d1.x * s1.y],
        [0, 0, 0, s1.x, s1.y, 1, -d1.y * s1.x, -d1.y * s1.y],
        [s2.x, s2.y, 1, 0, 0, 0, -d2.x * s2.x, -d2.x * s2.y],
        [0, 0, 0, s2.x, s2.y, 1, -d2.y * s2.x, -d2.y * s2.y],
        [s3.x, s3.y, 1, 0, 0, 0, -d3.x * s3.x, -d3.x * s3.y],
        [0, 0, 0, s3.x, s3.y, 1, -d3.y * s3.x, -d3.y * s3.y],
        [s4.x, s4.y, 1, 0, 0, 0, -d4.x * s4.x, -d4.x * s4.y],
        [0, 0, 0, s4.x, s4.y, 1, -d4.y * s4.x, -d4.y * s4.y]
    ];

    const b = [d1.x, d1.y, d2.x, d2.y, d3.x, d3.y, d4.x, d4.y];

    // Solve Ax = b using Gaussian elimination (simplified)
    const x = solveLinearSystem(A, b);

    return {
        a: x[0], b: x[1], c: x[2],
        d: x[3], e: x[4], f: x[5],
        g: x[6], h: x[7], i: 1
    };
}

// Simple Gaussian elimination solver
function solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                maxRow = k;
            }
        }
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

        // Make all rows below this one 0 in current column
        for (let k = i + 1; k < n; k++) {
            const factor = augmented[k][i] / augmented[i][i];
            for (let j = i; j <= n; j++) {
                augmented[k][j] -= factor * augmented[i][j];
            }
        }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = augmented[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= augmented[i][j] * x[j];
        }
        x[i] /= augmented[i][i];
    }

    return x;
}

// Apply perspective transformation to correct keystone distortion
export function correctKeystone(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    corners: [Point, Point, Point, Point]
): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Calculate the bounding rectangle of the corners
    const minX = Math.min(...corners.map(p => p.x));
    const maxX = Math.max(...corners.map(p => p.x));
    const minY = Math.min(...corners.map(p => p.y));
    const maxY = Math.max(...corners.map(p => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    // Create destination rectangle (corrected rectangle)
    const dst: [Point, Point, Point, Point] = [
        { x: 0, y: 0 },           // top-left
        { x: width, y: 0 },       // top-right
        { x: width, y: height },  // bottom-right
        { x: 0, y: height }       // bottom-left
    ];

    // Adjust source corners relative to the bounding box
    const src: [Point, Point, Point, Point] = corners.map(p => ({
        x: p.x - minX,
        y: p.y - minY
    })) as [Point, Point, Point, Point];

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return canvas;

    // For each pixel in the destination, find corresponding source pixel
    const imageData = outputCtx.createImageData(width, height);
    const data = imageData.data;

    // Create a temporary canvas to get source image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas;
    
    tempCtx.drawImage(image, 0, 0);
    const sourceImageData = tempCtx.getImageData(0, 0, image.width, image.height);
    const sourceData = sourceImageData.data;

    // Simple bilinear interpolation for perspective correction
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Map destination point to source using inverse perspective transform
            const srcPoint = mapPointInverse(x, y, src, dst);
            
            if (srcPoint.x >= 0 && srcPoint.x < image.width && 
                srcPoint.y >= 0 && srcPoint.y < image.height) {
                
                // Bilinear interpolation
                const x1 = Math.floor(srcPoint.x);
                const y1 = Math.floor(srcPoint.y);
                const x2 = Math.min(x1 + 1, image.width - 1);
                const y2 = Math.min(y1 + 1, image.height - 1);
                
                const fx = srcPoint.x - x1;
                const fy = srcPoint.y - y1;
                
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 4; c++) {
                    const p1 = sourceData[(y1 * image.width + x1) * 4 + c];
                    const p2 = sourceData[(y1 * image.width + x2) * 4 + c];
                    const p3 = sourceData[(y2 * image.width + x1) * 4 + c];
                    const p4 = sourceData[(y2 * image.width + x2) * 4 + c];
                    
                    const interpolated = 
                        p1 * (1 - fx) * (1 - fy) +
                        p2 * fx * (1 - fy) +
                        p3 * (1 - fx) * fy +
                        p4 * fx * fy;
                    
                    data[idx + c] = Math.round(interpolated);
                }
            }
        }
    }

    outputCtx.putImageData(imageData, 0, 0);
    return outputCanvas;
}

// Simple inverse mapping (approximation)
function mapPointInverse(
    x: number, 
    y: number, 
    src: [Point, Point, Point, Point], 
    dst: [Point, Point, Point, Point]
): Point {
    // This is a simplified inverse mapping
    // For more accuracy, you'd need to solve the inverse perspective transformation
    
    const [s1, s2, s3, s4] = src;
    const [d1, d2, d3, d4] = dst;
    
    // Bilinear interpolation approximation
    const u = x / (dst[1].x - dst[0].x);
    const v = y / (dst[3].y - dst[0].y);
    
    // Interpolate along edges
    const top = {
        x: s1.x + u * (s2.x - s1.x),
        y: s1.y + u * (s2.y - s1.y)
    };
    
    const bottom = {
        x: s4.x + u * (s3.x - s4.x),
        y: s4.y + u * (s3.y - s4.y)
    };
    
    return {
        x: top.x + v * (bottom.x - top.x),
        y: top.y + v * (bottom.y - top.y)
    };
}