import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { androidTvApi, sendTvCode, submitReviewScreenshot } from '@/api/androidTv';
import { Button } from '@/components/primitives/Button';

type Phase =
  | 'idle'
  | 'loading'
  | 'confirm'
  | 'retry_loading'
  | 'screenshot'
  | 'screenshot_loading'
  | 'bonus_success'
  | 'bonus_used'
  | 'repeat_sent'
  | 'review_pending'
  | 'error';

const GUIDE_MEDIA = [
  {
    src: '/android-tv-api/guide/1.png',
    type: 'image',
    title: 'Откройте приложения на приставке',
  },
  {
    src: '/android-tv-api/guide/2.png',
    type: 'image',
    title: 'Запустите HAPP',
  },
  {
    src: '/android-tv-api/guide/3.png',
    type: 'image',
    title: 'Нажмите «Поделиться через Веб»',
  },
  {
    src: '/android-tv-api/guide/4.jpg',
    type: 'image',
    title: 'Не сканируйте QR-код',
  },
  {
    src: '/android-tv-api/guide/5.jpg',
    type: 'image',
    title: 'После отправки проверьте профиль',
  },
  {
    src: '/android-tv-api/guide/6.mp4',
    type: 'video',
    title: 'Видеоинструкция',
  },
] as const;

function TvIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function ArrowPathIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function validateTvCode(code: string): boolean {
  return /^[0-9A-Z]{5}$/.test(code.trim().toUpperCase());
}

function resolveSubscriptionLink(data: {
  subscription_url?: string | null;
  happ_link?: string | null;
  happ_cryptolink?: string | null;
  happ_crypto_link?: string | null;
}): string | null {
  return (
    data.happ_cryptolink || data.happ_crypto_link || data.happ_link || data.subscription_url || null
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-sm font-bold text-accent-400">
      {n}
    </span>
  );
}

function FlowStep({
  n,
  title,
  text,
  active,
  done,
}: {
  n: number;
  title: string;
  text: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border px-3 py-3 ${
        active ? 'border-accent-500/40 bg-accent-500/10' : 'border-dark-700/40 bg-dark-900/35'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done
            ? 'bg-success-500/20 text-success-400'
            : active
              ? 'bg-accent-500/20 text-accent-400'
              : 'bg-dark-700/70 text-dark-400'
        }`}
      >
        {done ? <CheckIcon /> : n}
      </span>
      <div>
        <p className={`text-sm font-semibold ${active ? 'text-dark-50' : 'text-dark-200'}`}>
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-dark-400">{text}</p>
      </div>
    </div>
  );
}

function GuideStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <StepBadge n={n} />
      <p className="pt-0.5 text-sm leading-relaxed text-dark-200">{text}</p>
    </div>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dark-700/50 bg-dark-900/45 px-4 py-3 text-sm leading-relaxed text-dark-300">
      {children}
    </div>
  );
}

function GuideMedia({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const item = GUIDE_MEDIA[activeIndex] ?? GUIDE_MEDIA[0];

  return (
    <div className="space-y-3 border-t border-dark-700/50 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dark-100">Визуальная инструкция</p>
          <p className="mt-0.5 text-xs text-dark-400">{item.title}</p>
        </div>
        <p className="shrink-0 text-xs font-medium text-dark-500">
          {activeIndex + 1}/{GUIDE_MEDIA.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-dark-700/50 bg-dark-900/60">
        {item.type === 'video' ? (
          <video
            src={item.src}
            controls
            preload="metadata"
            className="aspect-video w-full bg-dark-950 object-contain"
          />
        ) : (
          <img
            src={item.src}
            alt={item.title}
            loading="lazy"
            className="aspect-video w-full bg-dark-950 object-contain"
          />
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {GUIDE_MEDIA.map((media, index) => (
          <button
            key={media.src}
            type="button"
            onClick={() => onSelect(index)}
            className={`h-9 rounded-lg border text-xs font-semibold transition ${
              index === activeIndex
                ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                : 'border-dark-700/50 bg-dark-900/45 text-dark-400 hover:text-dark-100'
            }`}
            aria-label={media.title}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewBonusUsedNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning-500/20 bg-warning-500/10 p-5">
      <ExclamationIcon />
      <div>
        <p className="text-sm font-semibold text-warning-400">Бонус за отзыв уже использован</p>
        <p className="mt-1 text-sm text-dark-400">
          Повторный скриншот отправлять не нужно: бонус начисляется только один раз. Если профиль не
          появился на приставке, подключите устройство ещё раз или обратитесь в поддержку.
        </p>
      </div>
    </div>
  );
}

interface AndroidTvWizardProps {
  subscriptionId?: number;
  standalone?: boolean;
  allowTrialActivation?: boolean;
  onDone?: () => void;
  onReviewPending?: () => void;
}

export function AndroidTvWizard({
  subscriptionId,
  standalone = false,
  allowTrialActivation = false,
  onDone,
  onReviewPending,
}: AndroidTvWizardProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [guideMediaIndex, setGuideMediaIndex] = useState(0);
  const [happNoCount, setHappNoCount] = useState(0);
  const [hasSimilarVariants, setHasSimilarVariants] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoTrialAttemptedRef = useRef(false);

  const {
    data: linkData,
    isLoading: linkLoading,
    error: linkError,
    refetch: refetchConnectionLink,
  } = useQuery({
    queryKey: ['android-tv-connection-link', subscriptionId],
    queryFn: () => androidTvApi.getConnectionLink(subscriptionId),
    retry: false,
    staleTime: 60_000,
  });

  const { data: reviewStatus, refetch: refetchReviewStatus } = useQuery({
    queryKey: ['android-tv-review-status', subscriptionId],
    queryFn: () => androidTvApi.getReviewStatus(subscriptionId),
    retry: false,
    staleTime: 30_000,
  });

  const enableAndroidTvAccess = useMutation({
    mutationFn: () => androidTvApi.ensureSubscription(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['android-tv-connection-link'] });
      await queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      await refetchConnectionLink();
    },
    onError: (error: unknown) => {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data
        ?.detail;
      setErrorMsg(detail || 'Не удалось включить доступ для Android TV.');
      setPhase('error');
    },
  });

  const subscriptionLink = linkData ? resolveSubscriptionLink(linkData) : null;
  const canUploadReview = reviewStatus?.can_upload_review ?? true;
  const isDisabledReview = reviewStatus?.subscription_status === 'disabled';
  const isReviewPending = reviewStatus?.review_pending ?? false;
  const bonusDays = reviewStatus?.bonus_days ?? 23;
  const flowStep =
    phase === 'confirm'
      ? 3
      : phase === 'screenshot' || phase === 'screenshot_loading' || phase === 'review_pending'
        ? 4
        : phase === 'bonus_success' || phase === 'bonus_used' || phase === 'repeat_sent'
          ? 5
          : 2;

  useEffect(() => {
    if (!allowTrialActivation || autoTrialAttemptedRef.current) return;
    if (linkLoading || subscriptionLink) return;
    if (!linkError && linkData) return;

    autoTrialAttemptedRef.current = true;
    enableAndroidTvAccess.mutate();
  }, [
    enableAndroidTvAccess,
    allowTrialActivation,
    linkData,
    linkError,
    linkLoading,
    subscriptionLink,
  ]);

  useEffect(() => {
    if (!isDisabledReview) return;
    if (phase !== 'idle' && phase !== 'error') return;

    if (isReviewPending) {
      setPhase('review_pending');
      return;
    }
    if (canUploadReview) {
      setPhase('screenshot');
    }
  }, [canUploadReview, isDisabledReview, isReviewPending, phase]);

  const handleCodeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (raw.length <= 5) setCode(raw);
  }, []);

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();

      const trimmed = code.trim().toUpperCase();
      if (!validateTvCode(trimmed)) {
        setErrorMsg('Код должен состоять из 5 символов: цифры и заглавные английские буквы.');
        setPhase('error');
        return;
      }

      setPhase('loading');
      setErrorMsg('');
      setHappNoCount(0);
      setHasSimilarVariants(false);

      try {
        const result = await sendTvCode(trimmed, subscriptionId);

        if (result.success) {
          setHasSimilarVariants(result.variantsRemaining);
          setPhase('confirm');
          return;
        }

        if (result.errorCode === 'invalid_code') {
          setErrorMsg('Неверный код. Проверьте код на экране телевизора и попробуйте снова.');
        } else if (result.errorCode === 'server_error') {
          setErrorMsg('Сервер HAPP временно недоступен. Подождите немного и повторите попытку.');
        } else if (result.errorCode === 'network_error') {
          setErrorMsg('Ошибка сети при обращении к HAPP. Попробуйте ещё раз.');
        } else {
          setErrorMsg(result.errorMessage || 'Неизвестная ошибка. Попробуйте ещё раз.');
        }
        setPhase('error');
      } catch (error: unknown) {
        const detail = (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail;
        setErrorMsg(detail || 'Непредвиденная ошибка. Попробуйте ещё раз.');
        setPhase('error');
      }
    },
    [code, subscriptionId],
  );

  const handleRetry = useCallback(() => {
    setPhase('idle');
    setErrorMsg('');
    setCode('');
    setSelectedFile(null);
    setHappNoCount(0);
    setHasSimilarVariants(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleConfirmYes = useCallback(() => {
    setErrorMsg('');
    if (canUploadReview) {
      setPhase('screenshot');
      return;
    }
    setPhase('bonus_used');
  }, [canUploadReview]);

  const handleConfirmNo = useCallback(async () => {
    const nextNoCount = happNoCount + 1;
    setHappNoCount(nextNoCount);

    if (nextNoCount >= 2 || !hasSimilarVariants) {
      setErrorMsg(
        'Перезапустите приложение HAPP на приставке и введите новый код с экрана. Если снова не получится, обратитесь в поддержку.',
      );
      setCode('');
      setPhase('error');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const trimmed = code.trim().toUpperCase();
    if (!validateTvCode(trimmed)) {
      setErrorMsg('Перезапустите HAPP на приставке и введите новый код с экрана.');
      setPhase('error');
      return;
    }

    setPhase('retry_loading');
    setErrorMsg('');
    try {
      const result = await sendTvCode(trimmed, subscriptionId, true);
      if (result.success) {
        setHasSimilarVariants(false);
        setPhase('confirm');
        return;
      }

      setErrorMsg('Перезапустите HAPP на приставке и введите новый код с экрана.');
      setCode('');
      setPhase('error');
    } catch {
      setErrorMsg('Не удалось подключить профиль. Перезапустите HAPP и введите новый код.');
      setPhase('error');
    }
  }, [code, happNoCount, hasSimilarVariants, subscriptionId]);

  const handleScreenshotSubmit = useCallback(async () => {
    if (!selectedFile) {
      setErrorMsg('Выберите изображение со скриншотом отзыва.');
      setPhase('screenshot');
      return;
    }

    setPhase('screenshot_loading');
    setErrorMsg('');

    try {
      const result = await submitReviewScreenshot(selectedFile, subscriptionId);
      await refetchReviewStatus();
      if (result.review_status === 'repeat_sent') {
        setSelectedFile(null);
        setPhase('repeat_sent');
        await queryClient.invalidateQueries({ queryKey: ['android-tv-review-status'] });
        await queryClient.invalidateQueries({ queryKey: ['subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
        return;
      }
      setSelectedFile(null);
      setPhase('bonus_success');
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response?.status;
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data
        ?.detail;
      if (status === 409) {
        setErrorMsg('Бонус за отзыв уже был использован ранее.');
        setPhase('bonus_used');
        return;
      } else {
        setErrorMsg(detail || 'Не удалось загрузить скриншот. Попробуйте ещё раз.');
      }
      setPhase('screenshot');
    }
  }, [queryClient, refetchReviewStatus, selectedFile, subscriptionId]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-dark-100">
          <TvIcon />
          <p className="text-base font-semibold">Подключение Android TV</p>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <FlowStep
            n={1}
            title="Доступ"
            text="Если подписки нет, мы автоматически включим доступ для Android TV."
            done={Boolean(subscriptionLink)}
          />
          <FlowStep
            n={2}
            title="Код HAPP"
            text="Введите 5 символов с экрана телевизора. QR-код сканировать не нужно."
            active={flowStep === 2}
            done={flowStep > 2}
          />
          <FlowStep
            n={3}
            title="Проверка"
            text="После отправки кода обновите HAPP и подтвердите, появился ли профиль."
            active={flowStep === 3}
            done={flowStep > 3}
          />
          <FlowStep
            n={4}
            title="Отзыв"
            text={
              isDisabledReview
                ? 'Отправьте новый скриншот отзыва для проверки администратором.'
                : 'После подключения можно отправить скриншот отзыва.'
            }
            active={flowStep === 4}
            done={flowStep > 4}
          />
        </div>
        <div className="space-y-3">
          <GuideStep
            n={1}
            text="Скачайте приложение HAPP на приставку через Google Play. Если Google Play недоступен, используйте AppStore или OTA UPDATE."
          />
          <GuideStep n={2} text="Откройте приложение HAPP на приставке." />
          <GuideStep
            n={3}
            text='Нажмите "Поделиться через Веб" в нижней части экрана, чтобы увидеть 5-значный код.'
          />
          <GuideStep
            n={4}
            text="Введите этот код ниже. QR-код с телевизора сканировать не нужно."
          />
        </div>
        <div className="mt-4">
          <GuideMedia activeIndex={guideMediaIndex} onSelect={setGuideMediaIndex} />
        </div>
      </div>

      {allowTrialActivation && enableAndroidTvAccess.isPending && !subscriptionLink && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
          <p className="text-center text-sm text-dark-400">Включаем доступ для Android TV...</p>
        </div>
      )}

      {!enableAndroidTvAccess.isPending && !linkLoading && (linkError || !subscriptionLink) && (
        <div className="space-y-3 rounded-2xl border border-error-500/20 bg-error-500/10 p-4">
          <div className="flex items-start gap-3">
            <ExclamationIcon />
            <div>
              <p className="text-sm font-medium text-error-400">Подписка не найдена</p>
              <p className="mt-1 text-sm text-dark-400">
                Для подключения Android TV нужна активная подписка. Если вы пришли сюда впервые,
                нажмите кнопку ниже.
              </p>
            </div>
          </div>
          {allowTrialActivation && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              loading={enableAndroidTvAccess.isPending}
              onClick={() => enableAndroidTvAccess.mutate()}
            >
              Включить доступ
            </Button>
          )}
        </div>
      )}

      {(phase === 'idle' || phase === 'error') && (
        <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-5">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-dark-400">
            Код с экрана телевизора
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InfoNote>
              Код появляется в HAPP на телевизоре после кнопки «Поделиться через Веб». Вводите
              только 5 символов с экрана.
            </InfoNote>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABCD1"
              maxLength={5}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={linkLoading || !subscriptionLink}
              className="w-full rounded-xl border border-dark-600/50 bg-dark-900/50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em] text-dark-100 placeholder-dark-600 transition-all focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-40"
            />

            {phase === 'error' && errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3">
                <ExclamationIcon />
                <p className="text-sm text-error-400">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={code.length !== 5 || linkLoading || !subscriptionLink}
            >
              Подключить
            </Button>
          </form>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
          <p className="text-sm text-dark-400">Отправляем профиль на телевизор...</p>
        </div>
      )}

      {phase === 'retry_loading' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
          <p className="text-center text-sm text-dark-400">
            Проверяем подключение. Подождите немного и затем проверьте HAPP на приставке.
          </p>
        </div>
      )}

      {phase === 'confirm' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-success-500/20 bg-success-500/10 p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500/20 text-success-400">
              <CheckIcon />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-success-400">
                {happNoCount > 0 ? 'Пробуем подключить ещё раз' : 'Профиль отправлен!'}
              </p>
              <p className="mt-1 text-sm text-dark-400">
                {happNoCount > 0
                  ? 'Проверьте HAPP на приставке. Если профиль не появился, введите новый код с экрана.'
                  : 'Подписка должна появиться на приставке в течение минуты. Нажмите кнопку обновления в HAPP и проверьте профиль.'}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-success-500/20 bg-dark-900/40">
            <img
              src="/android-tv-api/guide/7.png"
              alt="Проверка активного профиля HAPP"
              loading="lazy"
              className="aspect-video w-full object-contain"
            />
          </div>

          <Button type="button" variant="primary" size="lg" fullWidth onClick={handleConfirmYes}>
            Да, профиль появился
          </Button>
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={handleConfirmNo}>
            {happNoCount > 0 ? 'Нет, ввести новый код' : 'Нет, профиль не появился'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            leftIcon={<ArrowPathIcon />}
            onClick={handleRetry}
          >
            Подключить другое устройство
          </Button>
        </div>
      )}

      {phase === 'bonus_used' && !isDisabledReview && (
        <div className="space-y-4">
          <ReviewBonusUsedNotice />
          {standalone && (
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={onDone}>
              Готово
            </Button>
          )}
        </div>
      )}

      {phase === 'screenshot' && canUploadReview && (
        <div className="space-y-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-5">
          <div>
            <p className="text-base font-semibold text-dark-100">
              {isDisabledReview ? '❌ Подписка временно отключена' : 'Бонус за отзыв'}
            </p>
            <p className="mt-1 text-sm text-dark-400">
              {isDisabledReview
                ? 'Загрузите новый скриншот отзыва.'
                : `Загрузите скриншот хорошего отзыва на маркетплейсе для получения +${bonusDays} дней.`}
            </p>
          </div>

          <InfoNote>
            На скриншоте должен быть виден ваш хороший отзыв. После загрузки скриншот отправится на
            проверку.
          </InfoNote>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-dark-300 file:mr-4 file:rounded-lg file:border-0 file:bg-dark-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-dark-100"
          />

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3">
              <ExclamationIcon />
              <p className="text-sm text-error-400">{errorMsg}</p>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedFile}
            onClick={handleScreenshotSubmit}
          >
            Загрузить скриншот
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={onDone ?? (() => setPhase('idle'))}
          >
            Пропустить
          </Button>
        </div>
      )}

      {phase === 'screenshot_loading' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
          <p className="text-sm text-dark-400">Проверяем скриншот...</p>
        </div>
      )}

      {phase === 'bonus_success' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-success-500/20 bg-success-500/10 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500/20 text-success-400">
            <CheckIcon />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-success-400">Скриншот принят</p>
            <p className="mt-1 text-sm text-dark-400">
              Мы добавили к подписке {bonusDays} дней. Обновите профиль в HAPP на приставке.
            </p>
          </div>
          {standalone && (
            <Button type="button" variant="secondary" size="lg" fullWidth onClick={onDone}>
              Готово
            </Button>
          )}
        </div>
      )}

      {phase === 'repeat_sent' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-success-500/20 bg-success-500/10 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500/20 text-success-400">
            <CheckIcon />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-success-400">Скриншот отправлен</p>
            <p className="mt-1 text-sm text-dark-400">
              Скриншот проходит проверку администратором. Подписка будет восстановлена, когда
              проверка завершится.
            </p>
          </div>
          {standalone && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onReviewPending ?? onDone}
            >
              В личный кабинет
            </Button>
          )}
        </div>
      )}

      {phase === 'review_pending' && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-warning-500/20 bg-warning-500/10 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-500/20 text-warning-300">
            <ExclamationIcon />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-warning-300">Скриншот на проверке</p>
            <p className="mt-1 text-sm text-dark-400">
              Скриншот проходит проверку администратором. Подписка будет восстановлена, когда
              проверка завершится.
            </p>
          </div>
          {standalone && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              fullWidth
              onClick={onReviewPending ?? onDone}
            >
              В личный кабинет
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
