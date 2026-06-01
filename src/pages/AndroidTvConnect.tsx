import { useSearchParams } from 'react-router';
import { AdminBackButton } from '@/components/admin';
import { AndroidTvWizard } from '@/components/android-tv/AndroidTvWizard';

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

export default function AndroidTvConnect() {
  const [searchParams] = useSearchParams();
  const subId = searchParams.get('sub') ? Number(searchParams.get('sub')) : undefined;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/connection" />
        <div className="flex items-center gap-2">
          <TvIcon />
          <h1 className="text-2xl font-bold text-dark-100">Подключение Android TV</h1>
        </div>
      </div>

      <AndroidTvWizard subscriptionId={subId} />
    </div>
  );
}
