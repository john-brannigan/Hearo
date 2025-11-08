import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * Get a signed URL from the backend for uploading to Google Cloud Storage
 */
async function getSignedUploadUrl(filename: string, contentType: string): Promise<{ signedUrl: string; gsUri: string; httpsUrl: string }> {
  console.log('Requesting signed URL from backend...');
  console.log('Backend URL:', BACKEND_API_URL);
  
  const resp = await fetch(`${BACKEND_API_URL}/api/get-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to get signed URL: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  return {
    signedUrl: data.signedUrl,
    gsUri: data.gsUri,
    httpsUrl: data.httpsUrl
  };
}

/**
 * Upload image to Google Cloud Storage using a signed URL
 * This is the secure, recommended approach for production
 */
export async function uploadImageToBackend(localUri: string): Promise<{ gsUri?: string; httpsUrl?: string; }> {
  if (!localUri) throw new Error('localUri required');

  console.log('Reading local image file...');
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
  
  const filename = localUri.split('/').pop() || `photo-${Date.now()}.jpg`;
  const contentType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  
  // Get signed URL from backend
  const { signedUrl, gsUri, httpsUrl } = await getSignedUploadUrl(filename, contentType);
  
  // Convert base64 to byte array
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  console.log('Uploading to Google Cloud Storage via signed URL...');
  const resp = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: byteArray,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`GCS Upload failed: ${resp.status} ${txt}`);
  }

  console.log('Upload successful to GCS:', { gsUri, httpsUrl });
  return { gsUri, httpsUrl };
}