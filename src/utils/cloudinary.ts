import { ProductResponseDto } from '../types/api';

const STORAGE_CLOUD_NAME_KEY = 'flowmart_cloudinary_cloud_name';
const STORAGE_PRESET_KEY = 'flowmart_cloudinary_upload_preset';

// Pre-configured defaults from Seller Android App (app/build.gradle.kts)
const DEFAULT_CLOUD_NAME = 'kfapwod1';
const DEFAULT_UPLOAD_PRESET = 'retail_flow_unsigned';
const DEFAULT_FOLDER = 'retail_flow_products';

export function getCloudinaryConfig() {
  const envCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const envPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ||
    import.meta.env.VITE_CLOUDINARY_UPLOAD_preset ||
    '';

  const storedCloudName = localStorage.getItem(STORAGE_CLOUD_NAME_KEY) || '';
  const storedPreset = localStorage.getItem(STORAGE_PRESET_KEY) || '';

  return {
    cloudName: (storedCloudName || envCloudName || DEFAULT_CLOUD_NAME).trim(),
    uploadPreset: (storedPreset || envPreset || DEFAULT_UPLOAD_PRESET).trim(),
  };
}

export function saveCloudinaryConfig(cloudName: string, uploadPreset: string) {
  localStorage.setItem(STORAGE_CLOUD_NAME_KEY, cloudName.trim());
  localStorage.setItem(STORAGE_PRESET_KEY, uploadPreset.trim());
}

/**
 * Compresses and resizes an image file in the browser (max 1080x1080, 85% JPEG quality)
 * matching AddProductActivity.compressUriToJpegBytes() in Seller Android App.
 */
async function compressImageFile(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 1080;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        const ratio = width / height;
        if (ratio > 1) {
          width = maxDim;
          height = Math.round(width / ratio);
        } else {
          height = maxDim;
          width = Math.round(height * ratio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          resolve(blob || file);
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an image directly to Cloudinary using the Unsigned Upload Preset
 * and returns the HTTPS secure_url.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary Cloud Name or Upload Preset is missing. Please check Cloudinary Settings.'
    );
  }

  const compressedBlob = await compressImageFile(file);

  const formData = new FormData();
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', DEFAULT_FOLDER);
  formData.append('file', compressedBlob, `product_${Date.now()}.jpg`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errMsg =
      data?.error?.message ||
      `Cloudinary error (${response.status}): Verify preset '${uploadPreset}' is Unsigned.`;
    throw new Error(errMsg);
  }

  const url: string = data.secure_url || data.url || '';
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * Extracts all valid product image URLs from a ProductResponseDto
 */
export function getProductImageUrls(product?: Partial<ProductResponseDto> | null): string[] {
  if (!product) return [];

  const rawList: string[] = [];

  if (Array.isArray(product.imageUrls)) {
    rawList.push(...product.imageUrls);
  }
  if (Array.isArray(product.images)) {
    rawList.push(...product.images);
  }
  if (typeof product.imageUrl === 'string') {
    rawList.push(product.imageUrl);
  }

  return Array.from(
    new Set(
      rawList
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim().replace(/^http:\/\/res\.cloudinary\.com/i, 'https://res.cloudinary.com'))
    )
  );
}

export function getPrimaryProductImage(product?: Partial<ProductResponseDto> | null): string | null {
  const urls = getProductImageUrls(product);
  return urls.length > 0 ? urls[0] : null;
}