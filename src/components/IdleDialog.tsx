import { useRef, useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import { useTimerStore } from '../stores/timerStore';
import { Button, Card } from './ui';
import { Clock, Trash2, Check } from 'lucide-react';
import { formatDuration } from '../types';

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
        console.log('[IdleDialog] Mounted. Baseline accumulated:', baselineAccumulatedRef.current, 'IdleDuration:', idleDuration);
    }, [idleDuration]);

    const handleDiscard = () => {
        const store = useTimerStore.getState();
        const baseline = baselineAccumulatedRef.current ?? store.accumulatedPauseDuration;

        // Target: baseline + idleDuration (treat idle as break, subtract from work time)
        const targetAccumulated = baseline + idleDuration;

        console.log('[IdleDialog] Discard clicked. State:', store.state,
            'IdleDuration:', idleDuration,
            'Baseline:', baseline,
            'Current:', store.accumulatedPauseDuration,
            'Target:', targetAccumulated);

        if (store.state === 'running') {
            // Timer was already manually resumed
            // Set to target value (which accounts for the idle duration as a break)
            console.log('[IdleDialog] Retroactive discard. Setting accumulated to:', targetAccumulated);
            useTimerStore.setState({
                accumulatedPauseDuration: targetAccumulated
            });
        } else if (store.state === 'paused') {
            // Standard case: Timer is still paused
            console.log('[IdleDialog] Standard discard. Resuming with accumulated:', targetAccumulated);
            useTimerStore.setState({
                state: 'running',
                pauseStartTime: null,
                accumulatedPauseDuration: targetAccumulated
            });
        }
        emit('timer-idle-toggle', { active: false }).catch(console.error);
        onClose();
    };

    const handleKeepAll = () => {
        const store = useTimerStore.getState();
        const baseline = baselineAccumulatedRef.current ?? store.accumulatedPauseDuration;

        // Target: baseline only (idle time should count as work, not break)
        const targetAccumulated = baseline;

        console.log('[IdleDialog] Keep All clicked. State:', store.state,
            'IdleDuration:', idleDuration,
            'Baseline:', baseline,
            'Current:', store.accumulatedPauseDuration,
            'Target:', targetAccumulated);

        if (store.state === 'running') {
            // Timer was already manually resumed
            // The resume() added pause duration, so we need to reset to baseline
            console.log('[IdleDialog] Retroactive keep all. Setting accumulated to:', targetAccumulated);
            useTimerStore.setState({
                accumulatedPauseDuration: targetAccumulated
            });
        } else if (store.state === 'paused') {
            // Standard case: Timer is still paused
            console.log('[IdleDialog] Standard keep all. Resuming with accumulated:', targetAccumulated);
            useTimerStore.setState({
                state: 'running',
                pauseStartTime: null,
                accumulatedPauseDuration: targetAccumulated
            });
        }
        emit('timer-idle-toggle', { active: false }).catch(console.error);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-full">
                        <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Welcome Back!</h2>
                        <p className="text-sm text-muted-foreground">
                            You were away for {formatDuration(idleDuration)}
                        </p>
                    </div>
                </div>

                <p className="text-sm">
                    Your timer was paused while you were away. What would you like to do with this time?
                </p>

                <div className="space-y-2">
                    <Button
                        onClick={handleDiscard}
                        variant="outline"
                        className="w-full justify-start gap-3"
                    >
                        <Trash2 className="w-4 h-4" />
                        Discard idle time
                    </Button>
                    <Button
                        onClick={handleKeepAll}
                        variant="outline"
                        className="w-full justify-start gap-3"
                    >
                        <Check className="w-4 h-4" />
                        Keep all time
                    </Button>
                </div>
            </Card>
        </div>
    );
}
