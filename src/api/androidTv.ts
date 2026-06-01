import apiClient from './client';

const ANDROID_TV_API_BASE = '/android-tv-api';

function androidTvApiUrl(path: string): string {
  if (typeof window === 'undefined') return `${ANDROID_TV_API_BASE}${path}`;
  return `${window.location.origin}${ANDROID_TV_API_BASE}${path}`;
}

export interface HappSendResult {
  success: boolean;
  errorCode?: 'invalid_code' | 'server_error' | 'network_error' | 'unknown';
  errorMessage?: string;
}

interface HappConnectResponse {
  success: boolean;
  error_code?: HappSendResult['errorCode'] | null;
  error_message?: string | null;
}

interface ReviewScreenshotResponse {
  success: boolean;
  bonus_days: number;
}

interface MediaUploadResponse {
  media_type: string;
  file_id: string;
  file_unique_id: string | null;
  media_url: string;
}

export interface AndroidTvConnectionLink {
  subscription_url: string | null;
  happ_link?: string | null;
  happ_cryptolink?: string | null;
  happ_crypto_link?: string | null;
}

export async function sendTvCode(code: string, subscriptionId?: number): Promise<HappSendResult> {
  const response = await apiClient.post<HappConnectResponse>(androidTvApiUrl('/happ-connect'), {
    code: code.trim().toUpperCase(),
    subscription_id: subscriptionId ?? null,
  });

  return {
    success: response.data.success,
    errorCode: response.data.error_code ?? undefined,
    errorMessage: response.data.error_message ?? undefined,
  };
}

export async function uploadAndroidTvScreenshot(file: File): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('media_type', 'photo');

  const response = await apiClient.post<MediaUploadResponse>('/cabinet/media/upload', formData);
  return response.data;
}

export async function submitReviewScreenshot(
  fileId: string,
  subscriptionId?: number,
): Promise<ReviewScreenshotResponse> {
  const response = await apiClient.post<ReviewScreenshotResponse>(
    androidTvApiUrl('/review-screenshot'),
    {
      file_id: fileId,
      subscription_id: subscriptionId ?? null,
    },
  );
  return response.data;
}

export const androidTvApi = {
  getConnectionLink: async (subscriptionId?: number): Promise<AndroidTvConnectionLink> => {
    const response = await apiClient.get<AndroidTvConnectionLink>(
      '/cabinet/subscription/connection-link',
      { params: subscriptionId != null ? { subscription_id: subscriptionId } : undefined },
    );
    return response.data;
  },
  sendTvCode,
  uploadScreenshot: uploadAndroidTvScreenshot,
  submitReviewScreenshot,
};
