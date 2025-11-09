const express = require('express');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage
// Cloud Run provides automatic authentication via service account
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID
});

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

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔐 Project: ${process.env.GCP_PROJECT_ID}`);
});
