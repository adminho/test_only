export interface UploadMetadata {
  id: number;
  original_filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;      // ISO 8601
  download_url: string;
  created_at: string;       // ISO 8601
}

export interface InsertUploadInput {
  original_filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at?: string;     // defaults to now
  download_url: string;
}
