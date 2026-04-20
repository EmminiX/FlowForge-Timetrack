import { useRef, useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import { useTimerStore } from '../stores/timerStore';
import { Button, Modal } from './ui';
import { Clock, Trash2, Check } from 'lucide-react';
import { formatDuration } from '../types';
import { uiLogger } from '../lib/logger';

interface IdleDialogProps {
  idleDuration: number; // seconds
  onClose: () => void;
}

export function IdleDialog({ idleDuration, onClose }: IdleDialogProps) {
  // Capture the baseline accumulated pause duration when dialog opens
  // This allows us to correctly handle the case where user manually resumes before clicking a button
  const baselineAccumulatedRef = useRef<number | null>(null);

  useEffect(() => {
    // Capture baseline on mount
    const store = useTimerStore.getState();
    baselineAccumulatedRef.current = store.accumulatedPauseDuration;
    uiLogger.debug('Mounted. Baseline accumulated:', {
      baselineAccumulated: baselineAccumulatedRef.current,
      idleDuration,
    });
  }, [idleDuration]);

  const handleDiscard = () => {
    const store = useTimerStore.getState();
    const baseline = baselineAccumulatedRef.current ?? store.accumulatedPauseDuration;

    // Target: baseline + idleDuration (treat idle as break, subtract from work time)
    const targetAccumulated = baseline + idleDuration;

    uiLogger.debug('Discard clicked.', {
      state: store.state,
      idleDuration,
      baseline,
      current: store.accumulatedPauseDuration,
      target: targetAccumulated,
    });

    if (store.state === 'running') {
      // Timer was already manually resumed
      // Set to target value (which accounts for the idle duration as a break)
      uiLogger.debug('Retroactive discard. Setting accumulated to:', targetAccumulated);
      useTimerStore.setState({
        accumulatedPauseDuration: targetAccumulated,
      });
    } else if (store.state === 'paused') {
      // Standard case: Timer is still paused
      uiLogger.debug('Standard discard. Resuming with accumulated:', targetAccumulated);
      useTimerStore.setState({
        state: 'running',
        pauseStartTime: null,
        accumulatedPauseDuration: targetAccumulated,
      });
    }
    emit('timer-idle-toggle', { active: false }).catch((err) => uiLogger.error('Failed to emit idle toggle:', err));
    onClose();
  };

  const handleKeepAll = () => {
    const store = useTimerStore.getState();
    const baseline = baselineAccumulatedRef.current ?? store.accumulatedPauseDuration;

    // Target: baseline only (idle time should count as work, not break)
    const targetAccumulated = baseline;

    uiLogger.debug('Keep All clicked.', {
      state: store.state,
      idleDuration,
      baseline,
      current: store.accumulatedPauseDuration,
      target: targetAccumulated,
    });

    if (store.state === 'running') {
      // Timer was already manually resumed
      // The resume() added pause duration, so we need to reset to baseline
      uiLogger.debug('Retroactive keep all. Setting accumulated to:', targetAccumulated);
      useTimerStore.setState({
        accumulatedPauseDuration: targetAccumulated,
      });
    } else if (store.state === 'paused') {
      // Standard case: Timer is still paused
      uiLogger.debug('Standard keep all. Resuming with accumulated:', targetAccumulated);
      useTimerStore.setState({
        state: 'running',
        pauseStartTime: null,
        accumulatedPauseDuration: targetAccumulated,
      });
    }
    emit('timer-idle-toggle', { active: false }).catch((err) => uiLogger.error('Failed to emit idle toggle:', err));
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title='Welcome Back!' size='sm'>
      <div className='space-y-4'>
        <div className='flex items-center gap-3'>
          <div className='p-3 bg-amber-500/10 rounded-full'>
            <Clock className='w-6 h-6 text-amber-600 dark:text-amber-400' />
          </div>
          <p className='text-sm text-muted-foreground'>
            You were away for {formatDuration(idleDuration)}
          </p>
        </div>

        <p className='text-sm'>
          Your timer was paused while you were away. What would you like to do with this time?
        </p>

        <div className='space-y-2'>
          <Button onClick={handleDiscard} variant='outline' className='w-full justify-start gap-3'>
            <Trash2 className='w-4 h-4' />
            Discard idle time
          </Button>
          <Button onClick={handleKeepAll} variant='outline' className='w-full justify-start gap-3'>
            <Check className='w-4 h-4' />
            Keep all time
          </Button>
        </div>
      </div>
    </Modal>
  );
}
