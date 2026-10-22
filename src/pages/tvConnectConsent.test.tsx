// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { registerWithEmail, loginWithEmail } = vi.hoisted(() => ({
  registerWithEmail: vi.fn(),
  loginWithEmail: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : _key),
  }),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      isAuthenticated: false,
      isLoading: false,
      loginWithEmail,
      registerWithEmail,
    }),
}));

vi.mock('@/api/info', () => ({
  infoApi: {
    getLegalConsentConfig: () =>
      Promise.resolve({
        required: true,
        prechecked: false,
        documents: ['public_offer', 'privacy_policy'],
      }),
  },
}));

vi.mock('@/components/android-tv/AndroidTvWizard', () => ({
  AndroidTvWizard: () => null,
}));

vi.mock('@/components/primitives/Button', () => ({
  Button: ({
    children,
    loading: _loading,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button {...props}>{children}</button>
  ),
}));

async function renderPage() {
  const { default: TvConnect } = await import('./TvConnect');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TvConnect />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  registerWithEmail.mockReset();
  loginWithEmail.mockReset();
  registerWithEmail.mockResolvedValue({
    email: 'viewer@example.com',
    requires_verification: true,
  });
});

afterEach(cleanup);

describe('TvConnect registration consent', () => {
  it('requires both documents and sends their keys during registration', async () => {
    await renderPage();

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    for (const checkbox of checkboxes) fireEvent.click(checkbox);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'viewer@example.com' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Повторите пароль'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    await waitFor(() => expect(registerWithEmail).toHaveBeenCalledTimes(1));
    expect(registerWithEmail).toHaveBeenCalledWith(
      'viewer@example.com',
      'password123',
      undefined,
      undefined,
      ['public_offer', 'privacy_policy'],
    );
  });
});
