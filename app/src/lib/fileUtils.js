/**
 * FunLMS Kids - File Utilities
 * Base64 conversion for localStorage-compatible file storage
 */

// Maximum file sizes (in bytes)
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PDF_SIZE = 5 * 1024 * 1024;   // 5MB

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Validate and convert an image file
 */
export async function processImage(file) {
    if (!file) return { success: false, error: 'No file provided' };

    // Check file type
    if (!file.type.startsWith('image/')) {
        return { success: false, error: 'File must be an image (JPG, PNG, GIF)' };
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
        return { success: false, error: 'Image must be less than 2MB' };
    }

    try {
        const base64 = await fileToBase64(file);
        return {
            success: true,
            data: base64,
            type: file.type,
            name: file.name,
            size: file.size,
        };
    } catch (error) {
        return { success: false, error: 'Failed to process image' };
    }
}

/**
 * Validate and convert a PDF file
 */
export async function processPDF(file) {
    if (!file) return { success: false, error: 'No file provided' };

    // Check file type
    if (file.type !== 'application/pdf') {
        return { success: false, error: 'File must be a PDF' };
    }

    // Check file size
    if (file.size > MAX_PDF_SIZE) {
        return { success: false, error: 'PDF must be less than 5MB' };
    }

    try {
        const base64 = await fileToBase64(file);
        return {
            success: true,
            data: base64,
            type: file.type,
            name: file.name,
            size: file.size,
        };
    } catch (error) {
        return { success: false, error: 'Failed to process PDF' };
    }
}

/**
 * Create a resized thumbnail from an image (for smaller storage)
 */
export async function createThumbnail(file, maxWidth = 200, maxHeight = 200) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = reject;

        fileToBase64(file).then(base64 => {
            img.src = base64;
        }).catch(reject);
    });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default {
    fileToBase64,
    processImage,
    processPDF,
    createThumbnail,
    formatFileSize,
    MAX_IMAGE_SIZE,
    MAX_PDF_SIZE,
};
