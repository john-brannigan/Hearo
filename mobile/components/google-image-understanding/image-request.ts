// ...existing code...
import { GoogleGenAI } from '@google/genai';

const DEFAULT_LOCATION = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_LOCATION || 'us-central1';
const DEFAULT_PROJECT = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT;


const PROMPT = `Speak directly to them, using phrases like 'you are seeing…' or 'in front of you…'. Summarize the scene concisely, focusing on the most important objects, people, and actions. Avoid unnecessary details, colors, or technical jargon. Make the description clear and easy to imagine, keeping it short and to the point. If there is text, describe the general gist of the text. If there are any outstanding signs, briefly say the title/description of the sign as well.`;

/**
 * Send an image (URI) and a text prompt to the Google GenAI image-text model.
 *
 * @param uri - Image URI (gs://, https://, or other accessible URI)
 * @param prompt - The textual prompt to send alongside the image (optional; falls back to PROMPT)
 * @param projectId - Optional Google Cloud project id (defaults to env GOOGLE_CLOUD_PROJECT)
 * @param location - Optional location (defaults to env GOOGLE_CLOUD_LOCATION or 'global')
 * @returns The model's text response
 */
export default async function sendImageWithPrompt(
  uri: string,
  prompt?: string,
  projectId: string | undefined = DEFAULT_PROJECT,
  location: string = DEFAULT_LOCATION
): Promise<string> {
  console.log('sendImageWithPrompt called with:', { uri, projectId, location });
  
  if (!projectId) {
    throw new Error('Google Cloud project ID not provided. Set GOOGLE_CLOUD_PROJECT env var or pass projectId.');
  }
  if (!uri) {
    throw new Error('Image URI is required.');
  }

  // If a specific question prompt was provided, build a targeted prompt; otherwise use the default PROMPT.
  const promptToUse = prompt != ''
    ? `You are describing what is in front of a blind person. Speak directly to them, using phrases like 'you are seeing…' or 'in front of you…'. \n Answer the following question they have about the scene: "${prompt}". Avoid unnecessary details, colors, or technical jargon. Make the answer clear and easy to understand, keeping it short and to the point.`
    : PROMPT;


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
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_API_KEY,
  });

  const image = {
    fileData: {
      fileUri: uri,
      mimeType: guessMime(uri),
    },
  };

  try {
    const config = {
      temperature: 1,
      topP: 0.87,
    };
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [image, promptToUse],
      config: config,
    });

    if (typeof response?.text === 'string') {
      return response.text;
    }

    return JSON.stringify(response);
  } catch (err) {
    throw new Error(`generateContent failed: ${(err as Error).message}`);
  }
}

// ...existing code...