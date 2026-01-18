import { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Square, Coffee } from 'lucide-react';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { projectService, timeEntryService, settingsService } from '../../services';
import type { Project, AppSettings } from '../../types';
import { formatDuration } from '../../types';
import { Button, Select, Card } from '../../components/ui';
import { playBreakSound, playWorkResumeSound } from '../../lib/sounds';
import { notifyBreakTime } from '../../lib/notifications';
import clsx from 'clsx';

export function TimerView() {
    const {
        state: timerState,
        projectId,
        projectName,
        projectColor,
        start,
        pause,
        resume,
        stop,
        getElapsedSeconds,
    } = useTimerWithEffects();

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [saving, setSaving] = useState(false);

    // Pomodoro state
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [breakNotified, setBreakNotified] = useState(false);
    const [showBreakReminder, setShowBreakReminder] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakSecondsRemaining, setBreakSecondsRemaining] = useState(0);

    // Load settings
    useEffect(() => {
        settingsService.load().then(setSettings).catch(console.error);
    }, []);

    // Load active projects
    useEffect(() => {
        projectService.getActive().then(setProjects).catch(console.error);
    }, []);

    // Update elapsed time every second when running
    useEffect(() => {
        if (timerState === 'idle') {
            setElapsedSeconds(0);
            setBreakNotified(false);
            setShowBreakReminder(false);
            setIsOnBreak(false);
            return;
        }

        const updateElapsed = () => {
            setElapsedSeconds(getElapsedSeconds());
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [timerState, getElapsedSeconds]);

    // Pomodoro break reminder check
    useEffect(() => {
        if (!settings?.pomodoroEnabled || timerState !== 'running' || breakNotified) return;

        const workSeconds = (settings.pomodoroWorkMinutes || 25) * 60;

        if (elapsedSeconds >= workSeconds) {
            setBreakNotified(true);
            setShowBreakReminder(true);

            if (settings.enableSoundFeedback) {
                playBreakSound();
            }

            if (settings.enableNotifications) {
                notifyBreakTime(settings.pomodoroBreakMinutes || 5).catch(console.warn);
            }
        }
    }, [elapsedSeconds, settings, timerState, breakNotified]);

    // Break countdown timer
    useEffect(() => {
        if (!isOnBreak || breakSecondsRemaining <= 0) return;

        const interval = setInterval(() => {
            setBreakSecondsRemaining(prev => {
                if (prev <= 1) {
                    // Break ended!
                    setIsOnBreak(false);
                    setShowBreakReminder(false);

                    if (settings?.enableSoundFeedback) {
                        playWorkResumeSound();
                    }

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOnBreak, breakSecondsRemaining, settings]);

    // Start break countdown
    const handleStartBreak = () => {
        const breakMinutes = settings?.pomodoroBreakMinutes || 5;
        setBreakSecondsRemaining(breakMinutes * 60);
        setIsOnBreak(true);
    };

    // Sync selected project with running timer
    useEffect(() => {
        if (projectId) {
            setSelectedProjectId(projectId);
        }
    }, [projectId]);

    const projectOptions = useMemo(() => {
        return projects.map((p) => ({
            value: p.id,
            label: p.name,
        }));
    }, [projects]);

    const handleStart = async () => {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (!project) return;

        await start(project.id, project.name, project.color);
    };

    const handlePause = async () => {
        await pause();
    };

    const handleResume = async () => {
        await resume();
    };

    const handleStop = async () => {
        const result = await stop();
        if (!result) return;

        setSaving(true);
        try {
            const entryData = {
                projectId: result.projectId,
                startTime: result.startTime,
                endTime: new Date().toISOString(),
                pauseDuration: result.pauseDuration,
                notes: '',
                isBillable: true,
                isBilled: false,
            };
            console.log('[Timer] Creating time entry with data:', entryData);
            await timeEntryService.create(entryData);
        } catch (err) {
            console.error('Failed to save time entry:', err);
        } finally {
            setSaving(false);
        }
    };

    const statusColors = {
        idle: 'text-muted-foreground',
        running: 'text-green-500',
        paused: 'text-orange-500',
    };

    const statusLabels = {
        idle: 'Ready',
        running: 'Tracking',
        paused: 'Paused',
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Timer</h1>
            </div>

            {/* Break Reminder Banner */}
            {showBreakReminder && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Coffee className="w-6 h-6 text-orange-500" />
                            <div>
                                {isOnBreak ? (
                                    <>
                                        <p className="font-medium text-orange-500">On Break</p>
                                        <p className="text-sm text-muted-foreground">
                                            Time remaining: <span className="font-mono font-medium">{formatDuration(breakSecondsRemaining)}</span>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-medium text-orange-500">Time for a break!</p>
                                        <p className="text-sm text-muted-foreground">
                                            You've been working for {settings?.pomodoroWorkMinutes || 25} minutes. Take a {settings?.pomodoroBreakMinutes || 5} minute break.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isOnBreak && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleStartBreak}
                                >
                                    Start Break
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowBreakReminder(false);
                                    setIsOnBreak(false);
                                }}
                            >
                                {isOnBreak ? 'Skip' : 'Dismiss'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Card className="p-8 text-center">
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <div
                        className={clsx(
                            'w-3 h-3 rounded-full',
                            timerState === 'idle' && 'bg-muted-foreground',
                            timerState === 'running' && 'bg-green-500 animate-pulse',
                            timerState === 'paused' && 'bg-orange-500'
                        )}
                    />
                    <span className={clsx('text-sm font-medium', statusColors[timerState])}>
                        {statusLabels[timerState]}
                    </span>
                </div>

                {/* Time display */}
                <div
                    className="text-7xl font-light font-mono tracking-wider mb-8"
                    style={{ color: timerState !== 'idle' && projectColor ? projectColor : undefined }}
                >
                    {formatDuration(elapsedSeconds)}
                </div>

                {/* Project info or selector */}
                {timerState !== 'idle' ? (
                    <div className="mb-8">
                        <div className="flex items-center justify-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: projectColor || '#007AFF' }}
                            />
                            <span className="text-lg font-medium text-foreground">{projectName}</span>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-sm mx-auto mb-8">
                        <Select
                            label="Project"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            options={projectOptions}
                            placeholder="Select a project..."
                        />
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    {timerState === 'idle' && (
                        <Button
                            size="lg"
                            onClick={handleStart}
                            disabled={!selectedProjectId || projects.length === 0}
                            className="gap-2 px-8"
                        >
                            <Play className="w-5 h-5" />
                            Start
                        </Button>
                    )}

                    {timerState === 'running' && (
                        <>
                            <Button
                                size="lg"
                                variant="secondary"
                                onClick={handlePause}
                                className="gap-2"
                            >
                                <Pause className="w-5 h-5" />
                                Pause
                            </Button>
                            <Button
                                size="lg"
                                variant="destructive"
                                onClick={handleStop}
                                loading={saving}
                                className="gap-2"
                            >
                                <Square className="w-5 h-5" />
                                Stop
                            </Button>
                        </>
                    )}

                    {timerState === 'paused' && (
                        <>
                            <Button
                                size="lg"
                                onClick={handleResume}
                                className="gap-2"
                            >
                                <Play className="w-5 h-5" />
                                Resume
                            </Button>
                            <Button
                                size="lg"
                                variant="destructive"
                                onClick={handleStop}
                                loading={saving}
                                className="gap-2"
                            >
                                <Square className="w-5 h-5" />
                                Stop
                            </Button>
                        </>
                    )}
                </div>

                {/* No projects hint */}
                {projects.length === 0 && timerState === 'idle' && (
                    <p className="mt-6 text-sm text-muted-foreground">
                        Create a project first to start tracking time.
                    </p>
                )}
            </Card>

            {/* Quick stats could go here */}
        </div>
    );
}
