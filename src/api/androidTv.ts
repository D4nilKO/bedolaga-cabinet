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

export async function submitReviewScreenshot(
  file: File,
  subscriptionId?: number,
): Promise<ReviewScreenshotResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (subscriptionId != null) {
    formData.append('subscription_id', String(subscriptionId));
  }

  const response = await apiClient.post<ReviewScreenshotResponse>(
    androidTvApiUrl('/review-screenshot-upload'),
    formData,
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
  submitReviewScreenshot,
};
