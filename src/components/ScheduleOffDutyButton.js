import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ============================================================================
// Schedule Off-Duty Button Component
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger, } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from './ui/select';
import { Clock, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_TIME_OPTIONS } from '../types/scheduler';
const getPhTime = () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
};
const getTomorrowAtTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const phTime = getPhTime();
    phTime.setDate(phTime.getDate() + 1);
    phTime.setHours(hours, minutes, 0, 0);
    return phTime;
};
/**
 * Button component for scheduling automatic off-duty status change
 */
export function ScheduleOffDutyButton({ officerId, officerName, currentStatus, scheduledTask, onSchedule, onCancelSchedule, getCountdown, compact = false, }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTime, setSelectedTime] = useState('08:00'); // Default to 8:00 AM
    const initialCountdown = scheduledTask && scheduledTask.status === 'pending' ? getCountdown(scheduledTask.scheduledTime) : null;
    const [countdown, setCountdown] = useState(initialCountdown);
    // Update countdown every second when there's a scheduled task
    useEffect(() => {
        if (!scheduledTask || scheduledTask.status !== 'pending') {
            return;
        }
        const updateCountdown = () => {
            const info = getCountdown(scheduledTask.scheduledTime);
            setCountdown(info);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [scheduledTask, getCountdown]);
    // Handle scheduling the off-duty
    const handleSchedule = useCallback(() => {
        const scheduledTime = getTomorrowAtTime(selectedTime);
        // Current time in Asia/Manila for comparison
        const nowInPh = getPhTime();
        // Check if the time is in the past (for edge cases)
        if (scheduledTime <= nowInPh) {
            toast.error('Selected time has already passed');
            return;
        }
        onSchedule(officerId, officerName, 'off-duty', scheduledTime);
        const timeLabel = DEFAULT_TIME_OPTIONS.find(opt => opt.value === selectedTime)?.label || selectedTime;
        toast.success(`Scheduled ${officerName} to go off-duty tomorrow at ${timeLabel}`);
        setIsOpen(false);
    }, [officerId, officerName, selectedTime, onSchedule]);
    // Handle canceling the scheduled off-duty
    const handleCancel = useCallback(() => {
        if (scheduledTask) {
            onCancelSchedule(scheduledTask.id);
            toast.info(`Cancelled scheduled off-duty for ${officerName}`);
        }
    }, [scheduledTask, officerName, onCancelSchedule]);
    // Format countdown for display
    const formatCountdown = (info) => {
        if (info.isExpired)
            return 'Executing...';
        const parts = [];
        if (info.days > 0)
            parts.push(`${info.days}d`);
        if (info.hours > 0)
            parts.push(`${info.hours}h`);
        if (info.minutes > 0)
            parts.push(`${info.minutes}m`);
        parts.push(`${info.seconds}s`);
        return parts.join(' ');
    };
    // Format the scheduled time for display
    const formatScheduledTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };
    // Don't show the button if officer is already off-duty
    if (currentStatus !== 'on-duty') {
        return null;
    }
    return (_jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { size: compact ? 'sm' : 'default', variant: "outline", className: `
            ${compact ? 'h-7 px-2 text-xs' : ''}
            border-blue-400 text-blue-600 hover:bg-blue-50
          `, title: "Schedule off-duty for tomorrow", children: [_jsx(Clock, { className: `${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-1` }), "Schedule"] }) }), _jsx(PopoverContent, { className: "w-80", align: "end", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm", children: "Schedule Off-Duty" }), _jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: officerName })] }), scheduledTask && (_jsx(Button, { variant: "ghost", size: "sm", className: "h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50", onClick: handleCancel, title: "Cancel scheduled off-duty", children: _jsx(X, { className: "w-4 h-4" }) }))] }), scheduledTask && scheduledTask.status === 'pending' && (_jsxs("div", { className: "bg-orange-50 border border-orange-200 rounded-md p-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-orange-800 mb-1", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs font-medium", children: "Scheduled for" })] }), _jsx("p", { className: "text-sm font-medium text-orange-900", children: formatScheduledTime(scheduledTask.scheduledTime) }), countdown && !countdown.isExpired && (_jsxs("p", { className: "text-xs text-orange-700 mt-1", children: ["Time remaining: ", formatCountdown(countdown)] }))] })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Select Time for Tomorrow" }), _jsxs(Select, { value: selectedTime, onValueChange: setSelectedTime, disabled: !!scheduledTask, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select time" }) }), _jsx(SelectContent, { children: DEFAULT_TIME_OPTIONS.map((option) => (_jsx(SelectItem, { value: option.value, children: _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: option.label }), option.description && (_jsx("span", { className: "text-xs text-muted-foreground", children: option.description }))] }) }, option.value))) })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Default: 8:00 AM" })] }), !scheduledTask && (_jsxs(Button, { onClick: handleSchedule, className: "w-full bg-blue-600 hover:bg-blue-700", children: [_jsx(Clock, { className: "w-4 h-4 mr-2" }), "Schedule Off-Duty"] })), _jsx("p", { className: "text-xs text-muted-foreground text-center", children: scheduledTask
                                ? 'The officer will automatically go off-duty at the scheduled time.'
                                : 'The officer will be automatically marked as off-duty tomorrow at the selected time.' })] }) })] }));
}
