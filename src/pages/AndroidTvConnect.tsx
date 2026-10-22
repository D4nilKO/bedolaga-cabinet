import { useSearchParams } from 'react-router';
import { AdminBackButton } from '@/components/admin';
import { AndroidTvWizard } from '@/components/android-tv/AndroidTvWizard';
import { TvIcon } from '@/components/icons';

export default function AndroidTvConnect() {
  const [searchParams] = useSearchParams();
  const subId = searchParams.get('sub') ? Number(searchParams.get('sub')) : undefined;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/connection" />
        <div className="flex items-center gap-2">
          <TvIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-dark-100">Подключение Android TV</h1>
        </div>
      </div>

      <AndroidTvWizard subscriptionId={subId} />
    </div>
  );
}
