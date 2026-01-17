import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { useTimerStore } from '../../stores/timerStore';
import { projectService, timeEntryService } from '../../services';
import type { Project } from '../../types';
import { formatDuration } from '../../types';
import { Button, Select, Card } from '../../components/ui';
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
    } = useTimerStore();

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [saving, setSaving] = useState(false);

    // Load active projects
    useEffect(() => {
        projectService.getActive().then(setProjects).catch(console.error);
    }, []);

    // Update elapsed time every second when running
    useEffect(() => {
        if (timerState === 'idle') {
            setElapsedSeconds(0);
            return;
        }

        const updateElapsed = () => {
            setElapsedSeconds(getElapsedSeconds());
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [timerState, getElapsedSeconds]);

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

    const handleStart = () => {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (!project) return;

        start(project.id, project.name, project.color);
    };

    const handlePause = () => {
        pause();
    };

    const handleResume = () => {
        resume();
    };

    const handleStop = async () => {
        const result = stop();
        if (!result) return;

        setSaving(true);
        try {
            await timeEntryService.create({
                projectId: result.projectId,
                startTime: result.startTime,
                endTime: new Date().toISOString(),
                pauseDuration: result.pauseDuration,
                notes: '',
                isBillable: true,
                isBilled: false,
            });
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
