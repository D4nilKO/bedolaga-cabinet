import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { androidTvApi } from '@/api/androidTv';
import { subscriptionApi } from '@/api/subscription';
import { useAuthStore } from '@/store/auth';
import { clearPendingAndroidTvTrial, hasPendingAndroidTvTrial } from '@/utils/tvReturn';

type TrialActivationResult = { kind: 'android-tv' } | { kind: 'standard' };

export function useTrialActivation(setTrialError: (message: string | null) => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);

  return useMutation({
    mutationFn: async (): Promise<TrialActivationResult> => {
      if (hasPendingAndroidTvTrial()) {
        await androidTvApi.ensureSubscription();
        return { kind: 'android-tv' };
      }

      await subscriptionApi.activateTrial();
      return { kind: 'standard' };
    },
    onSuccess: async (result) => {
      setTrialError(null);
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      await queryClient.invalidateQueries({ queryKey: ['trial-info'] });
      await queryClient.invalidateQueries({ queryKey: ['balance'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      await queryClient.invalidateQueries({ queryKey: ['android-tv-connection-link'] });
      await refreshUser();

      if (result.kind === 'android-tv') {
        clearPendingAndroidTvTrial();
        navigate('/tv', { replace: true });
      }
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      setTrialError(error.response?.data?.detail || t('common.error'));
    },
  });
}
