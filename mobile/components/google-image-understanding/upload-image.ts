import * as FileSystem from 'expo-file-system/next';

export async function uploadImageToBackend(localUri: string): Promise<{ gsUri?: string; httpsUrl?: string; }> {
  const BACKEND_URL = (process.env.BACKEND_URL as string) || 'http://localhost:3000';
  if (!localUri) throw new Error('localUri required');

  console.log('Reading local image file...');
  
  // Read file as bytes using new FileSystem API
  const file = new FileSystem.File(localUri);
  const bytes = await file.bytes();
  
  // Convert bytes to base64
  const base64 = btoa(String.fromCharCode(...bytes));

  const filename = localUri.split('/').pop() || `photo-${Date.now()}.jpg`;

  console.log(`Uploading to backend: ${BACKEND_URL}/api/upload-image`);
  const resp = await fetch(`${BACKEND_URL}/api/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, filename }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Upload failed: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  if (!data || (!data.gsUri && !data.httpsUrl)) throw new Error('Upload returned no URI');
  
  console.log('Upload successful:', data);
  return { gsUri: data.gsUri, httpsUrl: data.httpsUrl };
}