export interface UploadMetadata {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  project_id: string;
}

export interface UploadSuccessResponse {
  message: string;
  file_id: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
  download_url: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
