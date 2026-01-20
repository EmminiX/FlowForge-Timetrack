import { TimerView } from '../features/timer';
import { DashboardSummary } from '../features/dashboard';

export function Dashboard() {
  return (
    <div className='space-y-6'>
      <TimerView />
      <DashboardSummary />
    </div>
  );
}
