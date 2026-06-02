import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/auth';
import { AndroidTvWizard } from '@/components/android-tv/AndroidTvWizard';
import { Button } from '@/components/primitives/Button';
import { isValidEmail } from '@/utils/validation';
import { markAndroidTvReturn } from '@/utils/tvReturn';

type AuthMode = 'login' | 'register';
type Step = 'auth' | 'connect' | 'done';

function TvIcon() {
  return (
    <svg
      className="h-7 w-7"
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

function extractError(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || fallback
  );
}

function OnboardingStep({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-dark-700/40 bg-dark-900/35 px-3 py-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-sm font-bold text-accent-400">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-dark-100">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-dark-400">{text}</p>
      </div>
    </div>
  );
}

export default function TvConnect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const loginWithEmail = useAuthStore((state) => state.loginWithEmail);
  const registerWithEmail = useAuthStore((state) => state.registerWithEmail);

  const [step, setStep] = useState<Step>(isAuthenticated ? 'connect' : 'auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) setStep('connect');
  }, [isAuthenticated]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError('');
      setNotice('');

      if (!isValidEmail(email)) {
        setError('Введите корректный email.');
        return;
      }
      if (password.length < 8) {
        setError('Пароль должен быть не короче 8 символов.');
        return;
      }
      if (mode === 'register' && password !== confirmPassword) {
        setError('Пароли не совпадают.');
        return;
      }

      setLoading(true);
      try {
        if (mode === 'login') {
          await loginWithEmail(email, password);
          setStep('connect');
          return;
        }

        markAndroidTvReturn();
        const result = await registerWithEmail(email, password, firstName || undefined);
        if (result.requires_verification) {
          setNotice(
            `Мы отправили письмо для подтверждения на ${result.email}. После подтверждения вы вернётесь к подключению Android TV.`,
          );
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          return;
        }

        await loginWithEmail(email, password);
        setStep('connect');
      } catch (err) {
        setError(extractError(err, 'Не удалось выполнить действие. Попробуйте ещё раз.'));
      } finally {
        setLoading(false);
      }
    },
    [confirmPassword, email, firstName, loginWithEmail, mode, password, registerWithEmail],
  );

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-dark-700 border-t-accent-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-950 px-4 py-6 text-dark-100 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400">
            <TvIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Подключение Android TV</h1>
            <p className="mt-1 text-sm text-dark-400">
              Держите приставку рядом: код появится в HAPP на экране телевизора.
            </p>
          </div>
        </div>

        {step === 'auth' && (
          <section className="space-y-4 rounded-2xl border border-dark-700/50 bg-dark-800/50 p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <OnboardingStep
                n={1}
                title="Войдите или создайте аккаунт"
                text="Если аккаунта нет, после подтверждения email мы вернем вас к подключению Android TV."
              />
              <OnboardingStep
                n={2}
                title="Получите пробный доступ"
                text="После входа кабинет автоматически выдаст 7 дней подписки, как Android TV бот."
              />
              <OnboardingStep
                n={3}
                title="Введите код HAPP"
                text="Код берется с экрана телевизора после кнопки «Поделиться через Веб»."
              />
              <OnboardingStep
                n={4}
                title="Отправьте отзыв"
                text="Скриншот хорошего отзыва на маркетплейсе даст дополнительные дни, если бонус еще не использован."
              />
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-dark-900/70 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'login'
                    ? 'bg-dark-700 text-dark-50'
                    : 'text-dark-400 hover:text-dark-100'
                }`}
              >
                Войти
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  mode === 'register'
                    ? 'bg-dark-700 text-dark-50'
                    : 'text-dark-400 hover:text-dark-100'
                }`}
              >
                Зарегистрироваться
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-300">Имя</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 text-dark-100 outline-none transition focus:border-accent-500/60"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-300">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 text-dark-100 outline-none transition focus:border-accent-500/60"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-dark-300">Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 text-dark-100 outline-none transition focus:border-accent-500/60"
                />
              </label>

              {mode === 'register' && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-dark-300">
                    Повторите пароль
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-dark-700 bg-dark-900/60 px-4 py-3 text-dark-100 outline-none transition focus:border-accent-500/60"
                  />
                </label>
              )}

              {notice && (
                <div className="rounded-xl border border-success-500/20 bg-success-500/10 px-4 py-3 text-sm leading-relaxed text-success-400">
                  {notice} Если ссылка из письма откроется в другой вкладке, просто вернитесь на эту
                  страницу: <span className="font-semibold">/tv</span>.
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-error-500/20 bg-error-500/10 px-4 py-3 text-sm text-error-400">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </Button>
            </form>
          </section>
        )}

        {step === 'connect' && (
          <AndroidTvWizard standalone allowTrialActivation onDone={() => setStep('done')} />
        )}

        {step === 'done' && (
          <section className="rounded-2xl border border-success-500/20 bg-success-500/10 p-8 text-center">
            <p className="text-lg font-semibold text-success-400">Готово</p>
            <p className="mt-2 text-sm text-dark-300">
              Android TV подключен. Можно закрыть страницу.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
