const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage
// When running on Cloud Run, authentication is automatic
// When running locally, it uses the keyFilename
const storageConfig = {
  projectId: process.env.GCP_PROJECT_ID
};

// Only use key file if it's specified (for local development)
if (process.env.GCP_KEY_FILE) {
  storageConfig.keyFilename = process.env.GCP_KEY_FILE;
}

const storage = new Storage(storageConfig);

const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate signed URL for uploading to Google Cloud Storage
app.post('/api/get-upload-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }

    console.log(`Generating signed URL for: ${filename}`);

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

    const response = {
      signedUrl,
      gsUri: `gs://${BUCKET_NAME}/${objectName}`,
      httpsUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`
    };

    console.log('Signed URL generated successfully');
    res.json(response);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate signed URL',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

// Listen on all network interfaces (0.0.0.0) to allow mobile device connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📱 Also accessible at http://143.215.103.93:${PORT}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔐 Project: ${process.env.GCP_PROJECT_ID}`);
  console.log('\nEndpoints:');
  console.log(`  GET  /health`);
  console.log(`  POST /api/get-upload-url`);
});
