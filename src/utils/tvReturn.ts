const TV_RETURN_KEY = 'android_tv_return_pending';

export function markAndroidTvReturn(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TV_RETURN_KEY, '1');
}

export function consumeAndroidTvReturn(): boolean {
  if (typeof window === 'undefined') return false;
  const pending = localStorage.getItem(TV_RETURN_KEY) === '1';
  if (pending) {
    localStorage.removeItem(TV_RETURN_KEY);
  }
  return pending;
}
