# AIATL2025 Backend Server

Backend service for generating Google Cloud Storage signed URLs for secure image uploads.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Cloud Storage API**
4. Create a Cloud Storage bucket:
   - Go to Cloud Storage > Buckets
   - Click "Create Bucket"
   - Choose a name (e.g., `aiatl2025-images`)
   - Select a region
   - Click "Create"

### 3. Service Account Setup

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `storage-uploader` (or any name you prefer)
4. Click **Create and Continue**
5. Grant role: **Storage Object Admin**
6. Click **Continue** > **Done**
7. Click on the service account you just created
8. Go to **Keys** tab
9. Click **Add Key** > **Create New Key**
10. Choose **JSON** format
11. Save the file as `service-account-key.json` in this directory

### 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
GCP_PROJECT_ID=your-actual-project-id
GCS_BUCKET_NAME=your-actual-bucket-name
GCP_KEY_FILE=./service-account-key.json
PORT=3000
```

### 5. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### Get Upload URL
```
POST /api/get-upload-url
Content-Type: application/json

{
  "filename": "photo.jpg",
  "contentType": "image/jpeg"
}
```

Returns:
```json
{
  "signedUrl": "https://storage.googleapis.com/...",
  "gsUri": "gs://bucket-name/uploads/123456-photo.jpg",
  "httpsUrl": "https://storage.googleapis.com/bucket-name/uploads/123456-photo.jpg"
}
```

## Testing

You can test the server with curl:

```bash
curl -X POST http://localhost:3000/api/get-upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```

## Security Notes

- **NEVER** commit `service-account-key.json` to version control
- **NEVER** commit `.env` to version control
- The signed URLs expire after 15 minutes
- For production, consider additional authentication on your endpoints
