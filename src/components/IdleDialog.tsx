import { useTimerStore } from '../stores/timerStore';
import { Button, Card } from './ui';
import { Clock, Trash2, Check } from 'lucide-react';
import { formatDuration } from '../types';

interface IdleDialogProps {
    idleDuration: number; // seconds
    onClose: () => void;
}

export function IdleDialog({ idleDuration, onClose }: IdleDialogProps) {
    const timerResume = useTimerStore(state => state.resume);

    const handleDiscard = () => {
        const store = useTimerStore.getState();
        if (store.state === 'running') {
            // Timer already resumed (retroactive fix).
            // We want to VALIDLY DISCARD the idle time (treat as break), so we ADD it to accumulatedPauseDuration.
            console.log('[IdleDialog] Retroactive discard. Adding to pause:', idleDuration);
            useTimerStore.setState({
                accumulatedPauseDuration: store.accumulatedPauseDuration + idleDuration
            });
        } else {
            // Standard Discard (Resume, counting break)
            timerResume();
        }
        onClose();
    };

    const handleKeepAll = () => {
        const store = useTimerStore.getState();
        console.log('[IdleDialog] Keep All. State:', store.state);

        if (store.state === 'running') {
            // Timer was already resumed manually (Discarded).
            // Retroactively "Keep All" by removing the idle duration from accumulated pause.
            console.log('[IdleDialog] Retroactively keeping all (running state). Subt:', idleDuration);
            useTimerStore.setState({
                accumulatedPauseDuration: Math.max(0, store.accumulatedPauseDuration - idleDuration)
            });
        } else {
            // Standard Keep All
            useTimerStore.setState({
                state: 'running',
                pauseStartTime: null
            });
        }
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
