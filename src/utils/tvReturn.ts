const TV_RETURN_KEY = 'android_tv_return_pending';
const TV_TRIAL_KEY = 'android_tv_trial_pending';
const TV_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getPendingTimestamp(key: string): number | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(key);
  if (!raw) return null;

  if (raw === '1') return Date.now();

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) {
    localStorage.removeItem(key);
    return null;
  }

  if (Date.now() - timestamp > TV_PENDING_TTL_MS) {
    localStorage.removeItem(key);
    return null;
  }

  return timestamp;
}

function setPending(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, String(Date.now()));
}

export function markAndroidTvReturn(): void {
  setPending(TV_RETURN_KEY);
  setPending(TV_TRIAL_KEY);
}

export function consumeAndroidTvReturn(): boolean {
  if (typeof window === 'undefined') return false;
  const pending = getPendingTimestamp(TV_RETURN_KEY) !== null;
  if (pending) {
    localStorage.removeItem(TV_RETURN_KEY);
  }
  return pending;
}

export function hasPendingAndroidTvTrial(): boolean {
  return getPendingTimestamp(TV_TRIAL_KEY) !== null;
}

export function clearPendingAndroidTvTrial(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TV_TRIAL_KEY);
}
