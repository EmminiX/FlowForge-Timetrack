import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Coffee, AlertTriangle } from 'lucide-react';
import { emit, listen } from '@tauri-apps/api/event';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { projectService, timeEntryService } from '../../services';
import type { Project } from '../../types';
import { formatDuration } from '../../types';
import { Button, Select, Card } from '../../components/ui';
import { playBreakSound, playWorkResumeSound } from '../../lib/sounds';
import { useSettings } from '../../contexts/SettingsContext';
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

    const { settings } = useSettings();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [saving, setSaving] = useState(false);

    // Pomodoro state
    const [breakNotified, setBreakNotified] = useState(false);
    const [showBreakReminder, setShowBreakReminder] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [breakSecondsRemaining, setBreakSecondsRemaining] = useState(0);
    const [lastBreakTime, setLastBreakTime] = useState(0);

    // Idle state
    const [isIdlePaused, setIsIdlePaused] = useState(false);

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
            setLastBreakTime(0);
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

        if ((elapsedSeconds - lastBreakTime) >= workSeconds) {
            setBreakNotified(true);
            setShowBreakReminder(true);

            if (settings.enableSoundFeedback) {
                playBreakSound();
            }
        }
    }, [elapsedSeconds, settings, timerState, breakNotified, lastBreakTime]);

    // Break countdown timer
    useEffect(() => {
        if (!isOnBreak || breakSecondsRemaining <= 0) return;

        const interval = setInterval(() => {
            setBreakSecondsRemaining(prev => {
                if (prev <= 1) {
                    // Break ended!
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

    // Emit break status to widget
    useEffect(() => {
        emit('timer-break-toggle', { active: showBreakReminder || isOnBreak }).catch(console.error);
    }, [showBreakReminder, isOnBreak]);

    // Listen for idle toggle events
    useEffect(() => {
        const unlisten = listen<{ active: boolean }>('timer-idle-toggle', (event) => {
            setIsIdlePaused(event.payload.active);
        });
        return () => {
            unlisten.then(f => f()).catch(() => { /* Already unlistened */ });
        };
    }, []);

    // Start break countdown
    const handleStartBreak = async () => {
        await pause(); // Pause the work timer
        const breakMinutes = settings?.pomodoroBreakMinutes || 5;
        setBreakSecondsRemaining(breakMinutes * 60);
        setIsOnBreak(true);
    };

    // Manual Resume after break
    const handleResumeWork = async () => {
        await resume();
        setIsOnBreak(false);
        setShowBreakReminder(false);
        setBreakNotified(false);
        setLastBreakTime(elapsedSeconds); // Reset cycle
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
            await emit('time-entry-saved');
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

            {/* Idle Warning Banner */}
            {isIdlePaused && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                        <div>
                            <p className="font-medium text-amber-500">IDLE - Timer Paused</p>
                            <p className="text-sm text-muted-foreground">
                                You've been away. The timer has been automatically paused.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Break Reminder Banner */}
            {showBreakReminder && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Coffee className="w-6 h-6 text-orange-500" />
                            <div>
                                {isOnBreak ? (
                                    <>
                                        <p className="font-medium text-orange-500">
                                            {breakSecondsRemaining === 0 ? "Break Finished!" : "On Break"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {breakSecondsRemaining === 0
                                                ? "Ready to resume working?"
                                                : <span>Time remaining: <span className="font-mono font-medium">{formatDuration(breakSecondsRemaining)}</span></span>
                                            }
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
                            {isOnBreak ? (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={breakSecondsRemaining === 0 ? handleResumeWork : undefined}
                                    disabled={breakSecondsRemaining > 0}
                                    className={breakSecondsRemaining > 0 ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                    Resume Work
                                </Button>
                            ) : (
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
                                    setBreakNotified(false);
                                    setLastBreakTime(elapsedSeconds); // Reset cycle on dismiss
                                }}
                            >
                                {isOnBreak ? 'Skip Break' : 'Dismiss'}
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
                    className={clsx(
                        'text-7xl font-light font-mono tracking-wider mb-8',
                        isIdlePaused && 'animate-flicker-timer'
                    )}
                    style={{ color: isIdlePaused ? '#f59e0b' : (timerState !== 'idle' && projectColor ? projectColor : undefined) }}
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
