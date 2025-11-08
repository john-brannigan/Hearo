/**
 * Backend API endpoint to generate Google Cloud Storage signed URLs
 * 
 * This file shows how to set up your backend to generate signed URLs.
 * Your mobile app will request a signed URL from this endpoint before uploading.
 * 
 * Setup instructions:
 * 1. Create a backend API (Node.js, Python, Go, etc.)
 * 2. Install @google-cloud/storage on your backend
 * 3. Use service account credentials on the backend (NEVER in mobile app)
 * 4. Generate signed URLs and return them to your mobile app
 */

// ============================================================================
// Example backend endpoint (Node.js/Express)
// ============================================================================
/*
const { Storage } = require('@google-cloud/storage');
const express = require('express');
const app = express();

// Initialize Google Cloud Storage with service account
const storage = new Storage({
  projectId: 'your-project-id',
  keyFilename: './path-to-service-account-key.json'
  // Or use Application Default Credentials if running on GCP
});

const BUCKET_NAME = 'your-bucket-name';

app.use(express.json());

app.post('/api/get-upload-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const objectName = `uploads/${Date.now()}-${filename}`;
    const file = bucket.file(objectName);

    // Generate a signed URL that expires in 15 minutes
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType || 'image/jpeg',
    });

    // Return the signed URL and the public URLs
    res.json({ 
      signedUrl,
      gsUri: `gs://${BUCKET_NAME}/${objectName}`,
      httpsUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
*/

// ============================================================================
// Example backend endpoint (Python/Flask)
// ============================================================================
/*
from flask import Flask, request, jsonify
from google.cloud import storage
import datetime
import time

app = Flask(__name__)

# Initialize Google Cloud Storage client
storage_client = storage.Client.from_service_account_json('path-to-service-account-key.json')
BUCKET_NAME = 'your-bucket-name'

@app.route('/api/get-upload-url', methods=['POST'])
def get_upload_url():
    try:
        data = request.get_json()
        filename = data.get('filename')
        content_type = data.get('contentType', 'image/jpeg')
        
        if not filename:
            return jsonify({'error': 'filename is required'}), 400
        
        bucket = storage_client.bucket(BUCKET_NAME)
        object_name = f"uploads/{int(time.time() * 1000)}-{filename}"
        blob = bucket.blob(object_name)
        
        # Generate signed URL that expires in 15 minutes
        signed_url = blob.generate_signed_url(
            version='v4',
            expiration=datetime.timedelta(minutes=15),
            method='PUT',
            content_type=content_type
        )
        
        return jsonify({
            'signedUrl': signed_url,
            'gsUri': f'gs://{BUCKET_NAME}/{object_name}',
            'httpsUrl': f'https://storage.googleapis.com/{BUCKET_NAME}/{object_name}'
        })
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({'error': 'Failed to generate signed URL'}), 500

if __name__ == '__main__':
    app.run(port=3000)
*/
