// ...existing code...
import { GoogleGenAI } from '@google/genai';

const DEFAULT_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const DEFAULT_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

/**
 * Send an image (URI) and a text prompt to the Google GenAI image-text model.
 *
 * @param uri - Image URI (gs://, https://, or other accessible URI)
 * @param prompt - The textual prompt to send alongside the image
 * @param projectId - Optional Google Cloud project id (defaults to env GOOGLE_CLOUD_PROJECT)
 * @param location - Optional location (defaults to env GOOGLE_CLOUD_LOCATION or 'global')
 * @returns The model's text response
 */
export default async function sendImageWithPrompt(
  uri: string,
  prompt: string,
  projectId: string | undefined = DEFAULT_PROJECT,
  location: string = DEFAULT_LOCATION
): Promise<string> {
  if (!projectId) {
    throw new Error('Google Cloud project ID not provided. Set GOOGLE_CLOUD_PROJECT env var or pass projectId.');
  }
  if (!uri) {
    throw new Error('Image URI is required.');
  }
  if (!prompt) {
    throw new Error('Prompt is required.');
  }

  // Basic mime-type guess from file extension (optional)
  function guessMime(u: string): string | undefined {
    const lower = u.split('?')[0].toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return undefined;
  }

  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
  });

  const image = {
    fileData: {
      fileUri: uri,
      mimeType: guessMime(uri),
    },
  };

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [image, prompt],
    });

    // response.text used previously; return that if present, otherwise stringify response
    if (typeof response?.text === 'string') {
      return response.text;
    }

    return JSON.stringify(response);
  } catch (err) {
    // rethrow after tagging for caller to handle
    throw new Error(`generateContent failed: ${(err as Error).message}`);
  }
}

// ...existing code...