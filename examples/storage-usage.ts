/**
 * WOWSQL Storage SDK - TypeScript Examples
 * Demonstrates S3 storage operations with automatic quota validation
 */

import { WOWSQLStorage, StorageLimitExceededError, StorageError } from '@wowsql/sdk';
import * as fs from 'fs';

// Initialize storage client
const storage = new WOWSQLStorage({
  projectSlug: 'myproject',
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.wowsql.com',
  autoCheckQuota: true, // Automatically validate limits before upload
});

/**
 * Example 1: Check storage quota and usage
 */
async function example1CheckQuota() {
  console.log('\n=== Example 1: Check Storage Quota ===');

  const quota = await storage.getQuota();

  console.log(`Plan: ${quota.plan_name}`);
  console.log(`Total Storage: ${(quota.storage_quota_gb + quota.storage_expansion_gb).toFixed(2)} GB`);
  console.log(`Used: ${quota.storage_used_gb.toFixed(2)} GB (${quota.usage_percentage.toFixed(1)}%)`);
  console.log(`Available: ${quota.storage_available_gb.toFixed(2)} GB`);

  if (quota.can_expand_storage) {
    console.log('💡 You can expand storage (Enterprise plan)');
  }
}

/**
 * Example 2: Upload a file with automatic limit validation
 */
async function example2UploadFile() {
  console.log('\n=== Example 2: Upload File ===');

  try {
    // Upload from file path (Node.js)
    const result = await storage.uploadFromPath(
      'documents/report.pdf',
      'report.pdf',
      { folder: 'reports' }
    );

    console.log(`✓ Uploaded: ${result.file_key}`);
    console.log(`  Size: ${(result.file_size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  Bucket: ${result.bucket_name}`);
  } catch (error) {
    if (error instanceof StorageLimitExceededError) {
      console.log(`✗ Upload blocked: ${error.message}`);
      console.log('  → Consider upgrading your plan for more storage');
    } else if (error instanceof Error && error.message.includes('not found')) {
      console.log('✗ File not found');
    } else {
      console.error('✗ Upload failed:', error);
    }
  }
}

/**
 * Example 3: Upload file from buffer
 */
async function example3UploadFromBuffer() {
  console.log('\n=== Example 3: Upload from Buffer ===');

  try {
    // Read file content
    const fileBuffer = fs.readFileSync('images/photo.jpg');

    const result = await storage.uploadFile(
      fileBuffer,
      'photo.jpg',
      {
        folder: 'images',
        contentType: 'image/jpeg',
      }
    );

    console.log(`✓ Uploaded: ${result.file_key}`);
  } catch (error) {
    if (error instanceof StorageLimitExceededError) {
      console.log('✗ Storage limit exceeded!');
      console.log(`  Message: ${error.message}`);

      // Check how much space is available
      const quota = await storage.getQuota(true);
      console.log(`  Available space: ${quota.storage_available_gb.toFixed(4)} GB`);
    }
  }
}

/**
 * Example 4: Manually check quota before upload
 */
async function example4ManualQuotaCheck() {
  console.log('\n=== Example 4: Manual Quota Check ===');

  const fileSize = 500 * 1024 * 1024; // 500 MB

  const check = await storage.checkUploadAllowed(fileSize);

  if (check.allowed) {
    console.log(`✓ ${check.message}`);
    // Proceed with upload (disable auto-check since we already checked)
    // const result = await storage.uploadFile(..., { checkQuota: false });
  } else {
    console.log(`✗ ${check.message}`);
  }
}

/**
 * Example 5: List files in storage
 */
async function example5ListFiles() {
  console.log('\n=== Example 5: List Files ===');

  // List all files
  const allFiles = await storage.listFiles();
  console.log(`Total files: ${allFiles.length}`);

  // List files in specific folder
  const documents = await storage.listFiles({ prefix: 'documents/' });
  console.log(`\nDocuments folder: ${documents.length} files`);

  // Show first 5 files
  for (const file of documents.slice(0, 5)) {
    const sizeMB = file.size / (1024 * 1024);
    console.log(`  - ${file.key}: ${sizeMB.toFixed(2)} MB`);
  }
}

/**
 * Example 6: Get presigned URL for file access
 */
async function example6GetFileUrl() {
  console.log('\n=== Example 6: Get File URL ===');

  const fileKey = 'documents/report.pdf';

  // Get presigned URL (valid for 1 hour)
  const urlData = await storage.getFileUrl(fileKey, 3600);

  console.log(`File: ${urlData.file_key}`);
  console.log(`Download URL: ${urlData.file_url.substring(0, 80)}...`);
  console.log(`Expires: ${urlData.expires_at}`);
  
  if (urlData.size) {
    const sizeMB = urlData.size / (1024 * 1024);
    console.log(`Size: ${sizeMB.toFixed(2)} MB`);
  }
}

/**
 * Example 7: Delete a file
 */
async function example7DeleteFile() {
  console.log('\n=== Example 7: Delete File ===');

  const result = await storage.deleteFile('old-files/temp.txt');
  console.log(`✓ ${result.message}`);

  // Quota is automatically refreshed after deletion
  const quota = await storage.getQuota();
  console.log(`Available storage: ${quota.storage_available_gb.toFixed(2)} GB`);
}

/**
 * Example 8: Get storage information
 */
async function example8StorageInfo() {
  console.log('\n=== Example 8: Storage Information ===');

  const info = await storage.getStorageInfo();

  console.log(`Bucket: ${info.bucket_name}`);
  console.log(`Region: ${info.region}`);
  console.log(`Status: ${info.status}`);
  console.log(`Total Objects: ${info.total_objects}`);
  console.log(`Total Size: ${info.total_size_gb.toFixed(2)} GB`);
}

/**
 * Example 9: Provision S3 storage (first time setup)
 */
async function example9ProvisionStorage() {
  console.log('\n=== Example 9: Provision Storage ===');

  try {
    // Get available regions first
    const regions = await storage.getAvailableRegions();
    console.log('Available regions:');
    
    // Show first 3 regions
    for (const region of regions.slice(0, 3)) {
      console.log(`  - ${region.name}: $${region.storage_price_gb}/GB/month`);
    }

    // Provision storage
    const result = await storage.provisionStorage('us-east-1');

    console.log('\n✓ Storage provisioned successfully!');
    console.log(`  Bucket: ${result.bucket_name}`);
    console.log(`  Region: ${result.region}`);
    console.log('\n⚠️  IMPORTANT: Save these credentials (shown only once):');
    console.log(`  Access Key: ${result.credentials.access_key_id}`);
    console.log(`  Secret Key: ${result.credentials.secret_access_key}`);
  } catch (error) {
    console.log('Note: Storage may already be provisioned');
  }
}

/**
 * Example 10: Comprehensive error handling
 */
async function example10ErrorHandling() {
  console.log('\n=== Example 10: Error Handling ===');

  try {
    // Try to upload a large file
    const largeFileData = Buffer.alloc(1024 ** 3 * 2); // 2 GB

    const result = await storage.uploadFile(largeFileData, 'large-file.bin');
  } catch (error) {
    if (error instanceof StorageLimitExceededError) {
      console.log('✗ Storage Limit Exceeded:');
      console.log(`  Status Code: ${error.statusCode}`);
      console.log(`  Message: ${error.message}`);

      // Get current quota to show user
      const quota = await storage.getQuota(true);
      console.log('\n📊 Current Usage:');
      console.log(`  Plan: ${quota.plan_name}`);
      console.log(`  Used: ${quota.storage_used_gb.toFixed(2)} GB / ${(quota.storage_quota_gb + quota.storage_expansion_gb).toFixed(2)} GB`);
      console.log(`  Available: ${quota.storage_available_gb.toFixed(2)} GB`);

      if (!quota.is_enterprise) {
        console.log('\n💡 Tip: Upgrade to a higher plan for more storage!');
      }
    } else if (error instanceof StorageError) {
      console.log(`✗ Storage Error: ${error.message}`);
    } else {
      console.log(`✗ Error: ${error}`);
    }
  }
}

/**
 * Example 11: Browser-based file upload
 */
async function example11BrowserUpload() {
  console.log('\n=== Example 11: Browser Upload ===');
  console.log('// In browser environment:');
  console.log(`
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload with progress feedback
    const result = await storage.uploadFile(buffer, file.name, {
      folder: 'uploads',
      contentType: file.type
    });
    
    console.log('✓ Upload successful:', result.file_key);
  } catch (error) {
    if (error instanceof StorageLimitExceededError) {
      alert('Storage limit exceeded! Please upgrade your plan.');
    }
  }
};
  `);
}

/**
 * Example 12: Batch upload with progress tracking
 */
async function example12BatchUpload() {
  console.log('\n=== Example 12: Batch Upload ===');

  const filesToUpload: Array<[string, string]> = [
    ['file1.txt', 'folder1'],
    ['file2.txt', 'folder1'],
    ['image.jpg', 'images'],
  ];

  // Check total size first
  const totalSize = filesToUpload.reduce((sum, [filePath]) => {
    try {
      return sum + fs.statSync(filePath).size;
    } catch {
      return sum;
    }
  }, 0);

  const check = await storage.checkUploadAllowed(totalSize);

  if (!check.allowed) {
    console.log(`✗ Cannot upload batch: ${check.message}`);
    return;
  }

  console.log(`✓ Starting batch upload (${(totalSize / (1024 * 1024)).toFixed(2)} MB)...`);

  for (const [filePath, folder] of filesToUpload) {
    try {
      if (fs.existsSync(filePath)) {
        const result = await storage.uploadFromPath(filePath, undefined, {
          folder,
          checkQuota: false, // Already checked total
        });
        console.log(`  ✓ ${result.file_key}`);
      }
    } catch (error) {
      console.log(`  ✗ ${filePath}: ${error}`);
    }
  }

  console.log('Batch upload complete!');
}

/**
 * Example 13: Generate presigned URLs for direct uploads
 */
async function example13PresignedUrls() {
  console.log('\n=== Example 13: Presigned URLs ===');

  // Get download URL
  const downloadUrl = await storage.getPresignedUrl('documents/report.pdf');
  console.log(`Download URL: ${downloadUrl.substring(0, 80)}...`);

  // Get upload URL (for client-side direct upload)
  const uploadUrl = await storage.getPresignedUrl('new-file.pdf', {
    operation: 'put_object',
    expiresIn: 1800, // 30 minutes
  });
  console.log(`Upload URL: ${uploadUrl.substring(0, 80)}...`);
  
  console.log('\n// Use this URL for direct browser uploads without going through your server:');
  console.log(`
fetch(uploadUrl, {
  method: 'PUT',
  body: fileData,
  headers: {
    'Content-Type': 'application/pdf'
  }
});
  `);
}

/**
 * Example 14: React/Next.js integration
 */
function example14ReactIntegration() {
  console.log('\n=== Example 14: React/Next.js Integration ===');
  console.log(`
// hooks/useStorage.ts
import { WOWSQLStorage } from '@wowsql/sdk';
import { useState } from 'react';

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  
  const storage = new WOWSQLStorage({
    projectSlug: process.env.NEXT_PUBLIC_PROJECT_SLUG!,
    apiKey: process.env.NEXT_PUBLIC_API_KEY!,
  });
  
  const uploadFile = async (file: File, folder?: string) => {
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const result = await storage.uploadFile(buffer, file.name, {
        folder,
        contentType: file.type
      });
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      setUploading(false);
    }
  };
  
  const checkQuota = async () => {
    const q = await storage.getQuota();
    setQuota(q);
    return q;
  };
  
  return { storage, uploadFile, checkQuota, uploading, quota };
}

// components/FileUploader.tsx
export function FileUploader() {
  const { uploadFile, checkQuota, uploading, quota } = useStorage();
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await uploadFile(file, 'uploads');
      alert(\`Uploaded: \${result.file_key}\`);
      
      // Refresh quota
      await checkQuota();
    } catch (error) {
      alert(\`Upload failed: \${error.message}\`);
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {quota && (
        <div>
          Available: {quota.storage_available_gb.toFixed(2)} GB
        </div>
      )}
    </div>
  );
}
  `);
}

// Main execution
async function runExamples() {
  console.log('='.repeat(60));
  console.log('WOWSQL Storage SDK - TypeScript Examples');
  console.log('='.repeat(60));

  // Note: Make sure to set your actual project slug and API key above

  try {
    await example1CheckQuota();
    // await example2UploadFile();
    // await example3UploadFromBuffer();
    // await example4ManualQuotaCheck();
    // await example5ListFiles();
    // await example6GetFileUrl();
    // await example7DeleteFile();
    // await example8StorageInfo();
    // await example9ProvisionStorage();
    // await example10ErrorHandling();
    // example11BrowserUpload();
    // await example12BatchUpload();
    // await example13PresignedUrls();
    // example14ReactIntegration();
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    console.log('\nMake sure to:');
    console.log('1. Set your actual projectSlug and apiKey');
    console.log('2. Provision storage for your project first');
    console.log('3. Have files ready to upload (or adjust file paths)');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  example1CheckQuota,
  example2UploadFile,
  example3UploadFromBuffer,
  example4ManualQuotaCheck,
  example5ListFiles,
  example6GetFileUrl,
  example7DeleteFile,
  example8StorageInfo,
  example9ProvisionStorage,
  example10ErrorHandling,
  example11BrowserUpload,
  example12BatchUpload,
  example13PresignedUrls,
  example14ReactIntegration,
};

