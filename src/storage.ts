/**
 * WowSQL Storage SDK - S3 Storage management with automatic quota validation
 * 
 * @version 2.1.0
 * @license MIT
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';

// ==================== Types ====================

export interface StorageConfig {
  /** Project slug (e.g., 'myproject') */
  projectSlug: string;
  /** API key for authentication */
  apiKey: string;
  /** API base URL (default: https://api.wowsql.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 60000 for file uploads) */
  timeout?: number;
  /** Automatically check quota before uploads (default: true) */
  autoCheckQuota?: boolean;
}

export interface StorageQuota {
  /** Storage quota in GB based on plan */
  storage_quota_gb: number;
  /** Current storage used in GB */
  storage_used_gb: number;
  /** Additional storage expansion in GB */
  storage_expansion_gb: number;
  /** Available storage in GB */
  storage_available_gb: number;
  /** Usage percentage (0-100) */
  usage_percentage: number;
  /** Whether storage can be expanded (Enterprise only) */
  can_expand_storage: boolean;
  /** Whether user is on Enterprise plan */
  is_enterprise: boolean;
  /** Plan name (e.g., 'Free', 'Pro', 'Business', 'Enterprise') */
  plan_name: string;
}

export interface StorageFile {
  /** File key/path in bucket */
  key: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  last_modified: string;
  /** ETag identifier */
  etag: string;
  /** Storage class (e.g., 'STANDARD') */
  storage_class: string;
  /** Presigned file URL (if requested) */
  file_url?: string;
  /** Public URL structure */
  public_url?: string;
}

export interface FileUploadResult {
  /** Upload success status */
  success: boolean;
  /** File key in bucket */
  file_key: string;
  /** File size in bytes */
  file_size: number;
  /** Bucket name */
  bucket_name: string;
  /** Optional presigned URL */
  url?: string;
  /** Success message */
  message: string;
}

export interface FileUrlResult {
  /** File key */
  file_key: string;
  /** Presigned download URL */
  file_url: string;
  /** Public URL structure */
  public_url: string;
  /** URL expiration timestamp */
  expires_at: string;
  /** Bucket name */
  bucket_name: string;
  /** AWS region */
  region: string;
  /** File size in bytes (if available) */
  size?: number;
}

export interface StorageInfo {
  /** Storage ID */
  s3_storage_id: number;
  /** S3 bucket name */
  bucket_name: string;
  /** AWS region */
  region: string;
  /** Storage status ('active', 'disabled', etc.) */
  status: string;
  /** Total number of objects */
  total_objects: number;
  /** Total size in bytes */
  total_size_bytes: number;
  /** Total size in GB */
  total_size_gb: number;
  /** Provisioning timestamp */
  provisioned_at?: string;
  /** Creation timestamp */
  created_at: string;
}

export interface ProvisionResult {
  /** Success status */
  success: boolean;
  /** Storage ID */
  s3_storage_id: number;
  /** Bucket name */
  bucket_name: string;
  /** Bucket ARN */
  bucket_arn: string;
  /** AWS region */
  region: string;
  /** IAM user name */
  iam_user_name: string;
  /** Access credentials (SAVE THESE - shown only once!) */
  credentials: {
    access_key_id: string;
    secret_access_key: string;
  };
  /** Provisioning timestamp */
  provisioned_at: string;
  /** Success message */
  message: string;
}

export interface S3Region {
  /** Region code (e.g., 'us-east-1') */
  code: string;
  /** Region name (e.g., 'US East N. Virginia') */
  name: string;
  /** Storage price per GB/month */
  storage_price_gb: number;
  /** Data transfer price per GB */
  transfer_price_gb: number;
  /** Latency tier */
  latency_tier: string;
  /** Recommended region flag */
  recommended: boolean;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageLimitExceededError extends StorageError {
  constructor(message: string, statusCode?: number, response?: any) {
    super(message, statusCode, response);
    this.name = 'StorageLimitExceededError';
  }
}

// ==================== Storage Client ====================

/**
 * WowSQL Storage Client - Manage S3 storage with automatic quota validation
 * 
 * Features:
 * - Automatic storage limit validation before upload
 * - Real-time quota checking
 * - File upload/download/delete operations
 * - Presigned URL generation
 * - Storage provisioning and management
 * 
 * @example
 * ```typescript
 * const storage = new WowSQLStorage({
 *   projectSlug: 'myproject',
 *   apiKey: 'your_api_key'
 * });
 * 
 * // Check quota
 * const quota = await storage.getQuota();
 * console.log(`Available: ${quota.storage_available_gb.toFixed(2)} GB`);
 * 
 * // Upload file (auto-validates limits)
 * const fileBuffer = fs.readFileSync('document.pdf');
 * const result = await storage.uploadFile(fileBuffer, 'document.pdf', {
 *   folder: 'documents'
 * });
 * 
 * // List files
 * const files = await storage.listFiles({ prefix: 'documents/' });
 * ```
 */
export class WowSQLStorage {
  private client: AxiosInstance;
  private projectSlug: string;
  private autoCheckQuota: boolean;
  private quotaCache?: StorageQuota;

  constructor(config: StorageConfig) {
    this.projectSlug = config.projectSlug;
    this.autoCheckQuota = config.autoCheckQuota !== false;

    const baseUrl = config.baseUrl || 'https://api.wowsql.com';

    // Create axios instance
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      timeout: config.timeout || 60000, // 60s default for file uploads
    });

    // Add error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<any>) => {
        if (error.response) {
          const errorData = error.response.data;
          const errorMessage = errorData?.detail || errorData?.message || error.message;

          // Check for storage limit exceeded
          if (error.response.status === 413) {
            throw new StorageLimitExceededError(
              errorMessage,
              error.response.status,
              errorData
            );
          }

          throw new StorageError(
            errorMessage,
            error.response.status,
            errorData
          );
        }
        throw new StorageError(error.message);
      }
    );
  }

  /**
   * Get storage quota and usage information
   * 
   * @param forceRefresh - Force refresh quota from server (default: false)
   * @returns Storage quota details
   * 
   * @example
   * ```typescript
   * const quota = await storage.getQuota();
   * console.log(`Used: ${quota.storage_used_gb} GB`);
   * console.log(`Available: ${quota.storage_available_gb} GB`);
   * console.log(`Usage: ${quota.usage_percentage}%`);
   * ```
   */
  async getQuota(forceRefresh: boolean = false): Promise<StorageQuota> {
    if (this.quotaCache && !forceRefresh) {
      return this.quotaCache;
    }

    const response = await this.client.get<StorageQuota>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/quota`
    );

    this.quotaCache = response.data;
    return response.data;
  }

  /**
   * Check if file upload is allowed based on storage quota
   * 
   * @param fileSizeBytes - Size of file to upload in bytes
   * @returns Object with allowed status and message
   * 
   * @example
   * ```typescript
   * const fileSize = 1024 * 1024 * 500; // 500 MB
   * const check = await storage.checkUploadAllowed(fileSize);
   * if (!check.allowed) {
   *   console.error(check.message);
   * }
   * ```
   */
  async checkUploadAllowed(fileSizeBytes: number): Promise<{ allowed: boolean; message: string }> {
    const quota = await this.getQuota(true);
    const fileSizeGB = fileSizeBytes / (1024 ** 3);

    if (fileSizeGB > quota.storage_available_gb) {
      return {
        allowed: false,
        message: `Storage limit exceeded! File size: ${fileSizeGB.toFixed(4)} GB, ` +
          `Available: ${quota.storage_available_gb.toFixed(4)} GB. ` +
          `Upgrade your plan to get more storage.`
      };
    }

    return {
      allowed: true,
      message: `Upload allowed. ${quota.storage_available_gb.toFixed(4)} GB available.`
    };
  }

  /**
   * Upload a file to S3 storage with automatic quota validation
   * 
   * @param fileData - File data as Buffer or Blob
   * @param fileName - File name
   * @param options - Upload options
   * @returns Upload result
   * 
   * @throws {StorageLimitExceededError} If storage quota would be exceeded
   * @throws {StorageError} If upload fails
   * 
   * @example
   * ```typescript
   * // Node.js - from file
   * const fileBuffer = fs.readFileSync('photo.jpg');
   * const result = await storage.uploadFile(fileBuffer, 'photo.jpg', {
   *   folder: 'images',
   *   contentType: 'image/jpeg'
   * });
   * 
   * // Browser - from File input
   * const file = document.querySelector('input[type="file"]').files[0];
   * const arrayBuffer = await file.arrayBuffer();
   * const result = await storage.uploadFile(
   *   Buffer.from(arrayBuffer),
   *   file.name,
   *   { folder: 'uploads' }
   * );
   * ```
   */
  async uploadFile(
    fileData: Buffer | Blob,
    fileName: string,
    options?: {
      folder?: string;
      contentType?: string;
      checkQuota?: boolean;
    }
  ): Promise<FileUploadResult> {
    // Get file size
    const fileSize = fileData instanceof Buffer ? fileData.length : (fileData as any).size;

    // Check quota if enabled
    const shouldCheck = options?.checkQuota !== undefined ? options.checkQuota : this.autoCheckQuota;
    if (shouldCheck) {
      const check = await this.checkUploadAllowed(fileSize);
      if (!check.allowed) {
        throw new StorageLimitExceededError(check.message, 413);
      }
    }

    // Prepare form data
    const formData = new FormData();
    const blob = fileData instanceof Buffer ? new Blob([fileData]) : fileData;
    formData.append('file', blob, fileName);

    // Build URL with query params
    const params = new URLSearchParams();
    if (options?.folder) {
      params.append('folder', options.folder);
    }

    const url = `/api/v1/storage/s3/projects/${this.projectSlug}/upload${params.toString() ? '?' + params.toString() : ''}`;

    // Upload
    const response = await this.client.post<FileUploadResult>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Clear quota cache after upload
    this.quotaCache = undefined;

    return response.data;
  }

  /**
   * Upload a file from filesystem path (Node.js only)
   * 
   * @param filePath - Path to local file
   * @param fileName - Optional file name in bucket (defaults to filename)
   * @param options - Upload options
   * @returns Upload result
   * 
   * @example
   * ```typescript
   * const result = await storage.uploadFromPath(
   *   'documents/report.pdf',
   *   'report.pdf',
   *   { folder: 'reports' }
   * );
   * ```
   */
  async uploadFromPath(
    filePath: string,
    fileName?: string,
    options?: {
      folder?: string;
      contentType?: string;
      checkQuota?: boolean;
    }
  ): Promise<FileUploadResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const name = fileName || filePath.split('/').pop() || 'file';

    return this.uploadFile(fileBuffer, name, options);
  }

  /**
   * List files in S3 bucket
   * 
   * @param options - List options
   * @returns Array of storage files
   * 
   * @example
   * ```typescript
   * const files = await storage.listFiles({ prefix: 'documents/' });
   * for (const file of files) {
   *   console.log(`${file.key}: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
   * }
   * ```
   */
  async listFiles(options?: {
    prefix?: string;
    maxKeys?: number;
  }): Promise<StorageFile[]> {
    const params: any = {};
    if (options?.prefix) params.prefix = options.prefix;
    if (options?.maxKeys) params.max_keys = options.maxKeys;

    const response = await this.client.get<{ files: StorageFile[] }>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/files`,
      { params }
    );

    return response.data.files || [];
  }

  /**
   * Delete a file from S3 bucket
   * 
   * @param fileKey - Path to file in bucket
   * @returns Deletion result
   * 
   * @example
   * ```typescript
   * const result = await storage.deleteFile('documents/old-file.pdf');
   * console.log(result.message);
   * ```
   */
  async deleteFile(fileKey: string): Promise<{ success: boolean; message: string; file_key: string }> {
    const response = await this.client.delete(
      `/api/v1/storage/s3/projects/${this.projectSlug}/files/${fileKey}`
    );

    // Clear quota cache after delete
    this.quotaCache = undefined;

    return response.data;
  }

  /**
   * Get presigned URL for file access
   * 
   * @param fileKey - Path to file in bucket
   * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
   * @returns File URL and metadata
   * 
   * @example
   * ```typescript
   * const urlData = await storage.getFileUrl('photo.jpg', 7200);
   * console.log(urlData.file_url); // Use this for downloads
   * ```
   */
  async getFileUrl(fileKey: string, expiresIn: number = 3600): Promise<FileUrlResult> {
    const response = await this.client.get<FileUrlResult>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/files/${fileKey}/url`,
      { params: { expires_in: expiresIn } }
    );

    return response.data;
  }

  /**
   * Generate presigned URL for file operations
   * 
   * @param fileKey - Path to file in bucket
   * @param options - Presigned URL options
   * @returns Presigned URL string
   * 
   * @example
   * ```typescript
   * // Download URL
   * const downloadUrl = await storage.getPresignedUrl('file.pdf');
   * 
   * // Upload URL
   * const uploadUrl = await storage.getPresignedUrl('new-file.pdf', {
   *   operation: 'put_object',
   *   expiresIn: 1800
   * });
   * ```
   */
  async getPresignedUrl(
    fileKey: string,
    options?: {
      expiresIn?: number;
      operation?: 'get_object' | 'put_object';
    }
  ): Promise<string> {
    const response = await this.client.post<{ url: string }>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/presigned-url`,
      {
        file_key: fileKey,
        expires_in: options?.expiresIn || 3600,
        operation: options?.operation || 'get_object',
      }
    );

    return response.data.url;
  }

  /**
   * Get S3 storage information for the project
   * 
   * @returns Storage information
   * 
   * @example
   * ```typescript
   * const info = await storage.getStorageInfo();
   * console.log(`Bucket: ${info.bucket_name}`);
   * console.log(`Region: ${info.region}`);
   * console.log(`Objects: ${info.total_objects}`);
   * console.log(`Size: ${info.total_size_gb.toFixed(2)} GB`);
   * ```
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const response = await this.client.get<StorageInfo>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/info`
    );

    return response.data;
  }

  /**
   * Provision S3 storage for the project
   * 
   * **IMPORTANT**: Save the credentials returned! They're only shown once.
   * 
   * @param region - AWS region (default: 'us-east-1')
   * @returns Provisioning result with credentials
   * 
   * @example
   * ```typescript
   * const result = await storage.provisionStorage('us-west-2');
   * console.log(`Bucket: ${result.bucket_name}`);
   * console.log(`Access Key: ${result.credentials.access_key_id}`);
   * // SAVE THESE CREDENTIALS SECURELY!
   * ```
   */
  async provisionStorage(region: string = 'us-east-1'): Promise<ProvisionResult> {
    const response = await this.client.post<ProvisionResult>(
      `/api/v1/storage/s3/projects/${this.projectSlug}/provision`,
      { region }
    );

    return response.data;
  }

  /**
   * Get list of available S3 regions with pricing
   * 
   * @returns Array of available regions
   * 
   * @example
   * ```typescript
   * const regions = await storage.getAvailableRegions();
   * for (const region of regions) {
   *   console.log(`${region.name}: $${region.storage_price_gb}/GB/month`);
   * }
   * ```
   */
  async getAvailableRegions(): Promise<S3Region[]> {
    const response = await this.client.get<S3Region[]>('/api/v1/storage/s3/regions');
    return response.data;
  }
}

export default WowSQLStorage;

