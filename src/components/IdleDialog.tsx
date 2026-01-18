import { useState } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { Button, Card } from './ui';
import { Clock, Trash2, Check, Edit3 } from 'lucide-react';
import { formatDuration } from '../types';

interface IdleDialogProps {
    idleDuration: number; // seconds
    onClose: () => void;
}

export function IdleDialog({ idleDuration, onClose }: IdleDialogProps) {
    const timerResume = useTimerStore(state => state.resume);
    const [adjustMinutes, setAdjustMinutes] = useState(
        Math.floor(idleDuration / 60)
    );
    const [showAdjust, setShowAdjust] = useState(false);

    const handleDiscard = () => {
        // Resume timer - idle time already excluded since we paused
        timerResume();
        onClose();
    };

    const handleKeepAll = () => {
        // Resume and add back the idle time by adjusting accumulated pause
        const store = useTimerStore.getState();
        const currentPause = store.accumulatedPauseDuration;
        // Subtract idle duration from pause to effectively "keep" that time
        useTimerStore.setState({
            accumulatedPauseDuration: Math.max(0, currentPause - idleDuration),
            state: 'running',
            pauseStartTime: null
        });
        onClose();
    };

    const handleAdjust = () => {
        const adjustSeconds = adjustMinutes * 60;

        const store = useTimerStore.getState();
        const currentPause = store.accumulatedPauseDuration;
        // Partially reduce pause duration to keep some of the time
        useTimerStore.setState({
            accumulatedPauseDuration: Math.max(0, currentPause - adjustSeconds),
            state: 'running',
            pauseStartTime: null
        });
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

                {showAdjust ? (
                    <div className="space-y-3">
                        <label className="text-sm font-medium">
                            Minutes to keep:
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={Math.ceil(idleDuration / 60)}
                            value={adjustMinutes}
                            onChange={(e) => setAdjustMinutes(Math.max(0, Number(e.target.value)))}
                            className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowAdjust(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleAdjust} className="flex-1">
                                Apply
                            </Button>
                        </div>
                    </div>
                ) : (
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
                        <Button
                            onClick={() => setShowAdjust(true)}
                            variant="outline"
                            className="w-full justify-start gap-3"
                        >
                            <Edit3 className="w-4 h-4" />
                            Adjust manually
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}
