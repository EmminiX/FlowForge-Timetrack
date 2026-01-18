import { Card } from '../../components/ui';
import { DollarSign, Clock } from 'lucide-react';

interface QuickStatsProps {
    unbilledAmount: number;
    weeklyHours: number;
}

export function QuickStats({ unbilledAmount, weeklyHours }: QuickStatsProps) {
    return (
        <Card className="p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Quick Stats
            </h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <div className="text-lg font-bold">
                            ${unbilledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">Unbilled</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="text-lg font-bold">
                            {weeklyHours.toFixed(1)}h
                        </div>
                        <div className="text-xs text-muted-foreground">This Week</div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
