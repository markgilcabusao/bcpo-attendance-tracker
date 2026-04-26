import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Shield, UserCheck, UserX, UserPlus, Trash2, Edit2, Search, Calendar as CalendarIcon, MapPin, Phone, Users, ChevronLeft, ChevronRight, CalendarDays, Clock, Timer, } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, } from 'date-fns';
// Removed time-utils import - using native Date() and date-fns
// getCurrentTime -> new Date()
// getTomorrowAtTime(timeStr) -> custom inline
// formatDbTime -> native formatting
// Scheduler imports
import { useUnifiedData } from './hooks/use-unified-data';
import { ScheduleOffDutyButton } from './components/ScheduleOffDutyButton';
function App() {
    // Use unified data hook (handles both Supabase and localStorage)
    const { officers, dutyRecords, deleteDutyRecord, addDutyRecord, loading, realtimeStatus, addOfficer, updateOfficer, deleteOfficer, checkInOfficer, checkOutOfficer, scheduleTask, cancelTask, getTaskForOfficer, refreshData, } = useUnifiedData();
    // Form state
    const [name, setName] = useState('');
    const [rank, setRank] = useState('');
    const [badgeNumber, setBadgeNumber] = useState('');
    const [unit, setUnit] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingOfficer, setEditingOfficer] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [officerToDelete, setOfficerToDelete] = useState(null);
    const [deleteDutyDialog, setDeleteDutyDialog] = useState({ open: false, dutyRecordId: '' });
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOfficerId, setSelectedOfficerId] = useState('');
    const [notes, setNotes] = useState('');
    // Schedule Off-Duty state
    const [scheduleTime, setScheduleTime] = useState('08:00');
    const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);
    // Refresh data when component mounts
    useEffect(() => {
        refreshData();
    }, [refreshData]);
    // Handle add officer
    const handleAddOfficer = async () => {
        if (!name.trim()) {
            toast.error('Please enter officer name');
            return;
        }
        if (!rank.trim()) {
            toast.error('Please enter rank');
            return;
        }
        try {
            await addOfficer(name.trim(), rank.trim(), badgeNumber.trim(), unit.trim());
            setName('');
            setRank('');
            setBadgeNumber('');
            setUnit('');
            toast.success('Officer registered successfully');
        }
        catch {
            toast.error('Failed to register officer');
        }
    };
    // Handle on duty
    const handleOnDuty = async (officerId) => {
        const officer = officers.find((o) => o.id === officerId);
        if (!officer)
            return;
        try {
            await checkInOfficer(officerId);
            // Automatically schedule off-duty for tomorrow at 8:00 AM
            const tomorrow = (() => {
                const now = new Date();
                const phTime = new Date(now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));
                phTime.setDate(phTime.getDate() + 1);
                phTime.setHours(8, 0, 0, 0);
                return phTime;
            })();
            await scheduleTask(officerId, officer.name, 'off-duty', tomorrow);
            toast.success(`${officer.name} is now ON DUTY`, {
                description: 'Auto-scheduled off-duty for tomorrow at 8:00 AM',
            });
        }
        catch {
            toast.error('Failed to check in officer');
        }
    };
    // Handle off duty
    const handleOffDuty = async (officerId) => {
        console.log('handleOffDuty called for:', officerId);
        try {
            const result = await checkOutOfficer(officerId);
            console.log('checkOutOfficer result:', result);
            if (result) {
                toast.success('Officer is now OFF DUTY');
            }
            else {
                toast.error('Failed to check out officer');
            }
        }
        catch (error) {
            console.error('handleOffDuty error:', error);
            toast.error('Failed to check out officer');
        }
    };
    // Handle delete
    const handleDelete = (officerId) => {
        setOfficerToDelete(officerId);
        setDeleteDialogOpen(true);
    };
    // Confirm delete
    const confirmDelete = async () => {
        if (officerToDelete) {
            try {
                await deleteOfficer(officerToDelete);
                toast.success('Officer removed from logbook');
                setDeleteDialogOpen(false);
                setOfficerToDelete(null);
            }
            catch {
                toast.error('Failed to remove officer');
            }
        }
    };
    // Handle edit
    const handleEdit = (officer) => {
        setEditingOfficer({
            id: officer.id,
            name: officer.name,
            rank: officer.rank,
            badgeNumber: officer.badgeNumber,
            unit: officer.unit,
        });
    };
    // Save edit
    const saveEdit = async () => {
        if (editingOfficer) {
            if (!editingOfficer.name.trim()) {
                toast.error('Name cannot be empty');
                return;
            }
            if (!editingOfficer.rank.trim()) {
                toast.error('Rank cannot be empty');
                return;
            }
            try {
                await updateOfficer(editingOfficer.id, {
                    name: editingOfficer.name.trim(),
                    rank: editingOfficer.rank.trim(),
                    badgeNumber: editingOfficer.badgeNumber?.trim(),
                    unit: editingOfficer.unit.trim(),
                });
                setEditingOfficer(null);
                toast.success('Officer information updated');
            }
            catch {
                toast.error('Failed to update officer');
            }
        }
    };
    // Get officers on duty for a specific date
    const getOfficersOnDutyForDate = (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Use Supabase duty records if available
        if (dutyRecords && dutyRecords.length > 0) {
            const officerIdsOnDuty = dutyRecords
                .filter((record) => record.duty_date === dateStr)
                .map((record) => record.officer_id);
            return officers.filter((officer) => officerIdsOnDuty.includes(officer.id));
        }
        // Fallback to local duty history
        return officers.filter((officer) => officer.dutyHistory?.some((record) => record.date === dateStr));
    };
    // Calendar generation
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        const days = [];
        let day = calendarStart;
        while (day <= calendarEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const handleDateClick = (date) => {
        setSelectedDate(date);
        setDayDetailsOpen(true);
    };
    const handleAssignClick = (date) => {
        setSelectedDate(date);
        setAssignDialogOpen(true);
    };
    const onDutyOfficers = officers.filter((o) => o.currentStatus === 'on-duty');
    const offDutyOfficers = officers.filter((o) => o.currentStatus === 'off-duty');
    const handleScheduleAllOffDuty = useCallback(async () => {
        const scheduledTime = (() => {
            const [hours, minutes] = scheduleTime.split(':').map(Number);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(hours, minutes, 0, 0);
            return tomorrow;
        })();
        const now = new Date();
        if (scheduledTime <= now) {
            toast.error('Selected time has already passed');
            return;
        }
        if (onDutyOfficers.length === 0) {
            toast.error('No officers are currently on duty');
            return;
        }
        // Schedule off-duty for all on-duty officers
        for (const officer of onDutyOfficers) {
            await scheduleTask(officer.id, officer.name, 'off-duty', scheduledTime);
        }
        const timeLabel = new Date(`2000-01-01T${scheduleTime}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        toast.success(`Scheduled ${onDutyOfficers.length} officer${onDutyOfficers.length > 1 ? 's' : ''} to go off-duty tomorrow at ${timeLabel}`);
        setIsSchedulePopoverOpen(false);
    }, [onDutyOfficers, scheduleTime, scheduleTask]);
    const filteredOfficers = officers.filter((officer) => officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.badgeNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
    // Helper to format Supabase time (HH:MM:SS) to 12-hour format - times stored as UTC, add 8 for PH display
    const formatTime = (timeStr) => {
        if (!timeStr)
            return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        // Add 8 hours for Philippine timezone
        let adjustedHours = (hours + 8) % 24;
        const hour12 = adjustedHours % 12 || 12;
        const ampm = adjustedHours >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };
    // Get countdown for a scheduled task
    const getCountdown = (scheduledTime) => {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const diff = scheduled.getTime() - now.getTime();
        if (diff <= 0) {
            return {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                totalMilliseconds: 0,
                isExpired: true,
            };
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return {
            days,
            hours,
            minutes,
            seconds,
            totalMilliseconds: diff,
            isExpired: false,
        };
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50", children: [_jsx(Toaster, { position: "top-right", richColors: true }), _jsx("header", { className: "bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg", children: _jsx("div", { className: "container mx-auto px-4 py-6", children: _jsxs("div", { className: "flex items-center justify-center gap-4", children: [_jsx("img", { src: "/pnp_logo_nobg.png", alt: "Philippine National Police", className: "h-16 md:h-20 object-contain" }), _jsx("div", { className: "text-center", children: _jsx("h1", { className: "text-2xl md:text-3xl font-bold tracking-wide", children: "BCPO Attendance Tracker" }) }), _jsx("img", { src: "/BCPO_LOGO_nobg.png", alt: "BCPO", className: "h-16 md:h-20 object-contain" })] }) }) }), _jsxs("main", { className: "container mx-auto px-4 py-8 max-w-7xl", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", children: [_jsx(Card, { className: "bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg", children: _jsxs(CardContent, { className: "p-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-green-100 text-sm font-medium", children: "ON DUTY NOW" }), _jsx("p", { className: "text-4xl font-bold", children: onDutyOfficers.length })] }), _jsx("div", { className: "bg-white/20 p-4 rounded-full", children: _jsx(UserCheck, { className: "w-8 h-8" }) })] }) }), _jsx(Card, { className: "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-lg", children: _jsxs(CardContent, { className: "p-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-100 text-sm font-medium", children: "OFF DUTY" }), _jsx("p", { className: "text-4xl font-bold", children: offDutyOfficers.length })] }), _jsx("div", { className: "bg-white/20 p-4 rounded-full", children: _jsx(UserX, { className: "w-8 h-8" }) })] }) }), _jsx(Card, { className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg", children: _jsxs(CardContent, { className: "p-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-100 text-sm font-medium", children: "TOTAL OFFICERS" }), _jsx("p", { className: "text-4xl font-bold", children: officers.length })] }), _jsx("div", { className: "bg-white/20 p-4 rounded-full", children: _jsx(Users, { className: "w-8 h-8" }) })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx(Input, { placeholder: "Search officers...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-9 border-gray-200 h-9 text-sm" })] }), _jsxs(Card, { className: "border-2 border-blue-100 shadow-xl bg-white/80 backdrop-blur", children: [_jsx(CardHeader, { className: "bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 py-3", children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-blue-900 text-base", children: [_jsx(UserPlus, { className: "w-4 h-4" }), "Register New Officer"] }) }), _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Full Name *" }), _jsx(Input, { placeholder: "Enter name", value: name, onChange: (e) => setName(e.target.value), className: "border-blue-200 h-9 text-sm" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Rank *" }), _jsx(Input, { placeholder: "e.g., PO1", value: rank, onChange: (e) => setRank(e.target.value), className: "border-blue-200 h-9 text-sm" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Badge #" }), _jsx(Input, { placeholder: "e.g., 12345", value: badgeNumber, onChange: (e) => setBadgeNumber(e.target.value), className: "border-blue-200 h-9 text-sm" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Unit" }), _jsx(Input, { placeholder: "e.g., Station 1", value: unit, onChange: (e) => setUnit(e.target.value), className: "border-blue-200 h-9 text-sm" })] })] }), _jsx("div", { className: "mt-3 flex justify-end", children: _jsxs(Button, { onClick: handleAddOfficer, size: "sm", className: "bg-blue-700 hover:bg-blue-800 text-white", disabled: loading, children: [_jsx(UserPlus, { className: "w-4 h-4 mr-1" }), "Register"] }) })] })] }), _jsxs(Card, { className: "border-2 border-gray-100 shadow-xl bg-white/80 backdrop-blur", children: [_jsx(CardHeader, { className: "bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 py-3", children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-gray-700 text-base", children: [_jsx(Users, { className: "w-4 h-4" }), "Officers List", _jsx(Badge, { variant: "secondary", className: "ml-2 text-xs", children: filteredOfficers.length }), _jsx("span", { className: `ml-auto w-2 h-2 rounded-full ${realtimeStatus === 'connected'
                                                                ? 'bg-green-500 animate-pulse'
                                                                : realtimeStatus === 'reconnecting'
                                                                    ? 'bg-yellow-500 animate-pulse'
                                                                    : 'bg-gray-400'}`, title: `Realtime: ${realtimeStatus}` })] }) }), _jsx(CardContent, { className: "p-0 max-h-80 overflow-y-auto", children: filteredOfficers.length === 0 ? (_jsxs("div", { className: "p-6 text-center text-gray-500", children: [_jsx(Users, { className: "w-10 h-10 mx-auto mb-2 text-gray-300" }), _jsx("p", { className: "text-sm", children: "No officers registered" })] })) : (_jsx("div", { className: "divide-y divide-gray-100", children: filteredOfficers.map((officer) => (_jsx("div", { className: "p-3 hover:bg-gray-50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-sm truncate", children: officer.name }), officer.currentStatus === 'on-duty' ? (_jsx(Badge, { className: "bg-green-500 text-white text-xs", children: "On Duty" })) : (_jsx(Badge, { variant: "outline", className: "text-gray-500 text-xs", children: "Off Duty" }))] }), _jsxs("div", { className: "text-xs text-gray-500 mt-0.5", children: [officer.rank, " ", officer.badgeNumber && `• #${officer.badgeNumber}`, ' ', officer.unit && `• ${officer.unit}`] })] }), _jsxs("div", { className: "flex gap-1 ml-2", children: [officer.currentStatus === 'off-duty' ? (_jsxs(Button, { size: "sm", onClick: () => handleOnDuty(officer.id), className: "bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs", children: [_jsx(UserCheck, { className: "w-3 h-3 mr-1" }), "On"] })) : (_jsxs(_Fragment, { children: [_jsxs(Button, { size: "sm", onClick: () => handleOffDuty(officer.id), variant: "outline", className: "border-orange-400 text-orange-600 hover:bg-orange-50 h-7 px-2 text-xs", children: [_jsx(UserX, { className: "w-3 h-3 mr-1" }), "Off"] }), _jsx(ScheduleOffDutyButton, { officerId: officer.id, officerName: officer.name, currentStatus: officer.currentStatus, scheduledTask: getTaskForOfficer(officer.id), onSchedule: scheduleTask, onCancelSchedule: cancelTask, getCountdown: getCountdown, compact: true })] })), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleEdit(officer), className: "text-blue-600 hover:bg-blue-50 h-7 w-7 p-0", children: _jsx(Edit2, { className: "w-3 h-3" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => handleDelete(officer.id), className: "text-red-600 hover:bg-red-50 h-7 w-7 p-0", children: _jsx(Trash2, { className: "w-3 h-3" }) })] })] }) }, officer.id))) })) })] })] }), _jsx("div", { className: "space-y-6", children: _jsxs(Card, { className: "border-2 border-blue-100 shadow-xl bg-white/80 backdrop-blur", children: [_jsx(CardHeader, { className: "bg-gradient-to-r from-blue-50 to-white border-b border-blue-100", children: _jsxs(CardTitle, { className: "flex items-center justify-between text-blue-900", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CalendarDays, { className: "w-5 h-5" }), "Duty Calendar"] }), _jsx("div", { className: "flex items-center gap-2", children: onDutyOfficers.length > 0 && (_jsxs(Popover, { open: isSchedulePopoverOpen, onOpenChange: setIsSchedulePopoverOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", variant: "outline", className: "border-orange-400 text-orange-600 hover:bg-orange-50 h-8 px-2 text-xs", title: "Schedule off-duty for all on-duty officers", children: [_jsx(Timer, { className: "w-3 h-3 mr-1" }), "Schedule Off-Duty"] }) }), _jsx(PopoverContent, { className: "w-72", align: "end", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm", children: "Schedule Off-Duty" }), _jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: ["Schedule all ", onDutyOfficers.length, " on-duty officer", onDutyOfficers.length > 1 ? 's' : '', " for tomorrow"] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-medium text-gray-700", children: "Select Time (Default: 8:00 AM)" }), _jsxs(Select, { value: scheduleTime, onValueChange: setScheduleTime, children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, { placeholder: "Select time" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "06:00", children: "6:00 AM" }), _jsx(SelectItem, { value: "07:00", children: "7:00 AM" }), _jsx(SelectItem, { value: "08:00", children: "8:00 AM (Default)" }), _jsx(SelectItem, { value: "09:00", children: "9:00 AM" }), _jsx(SelectItem, { value: "10:00", children: "10:00 AM" }), _jsx(SelectItem, { value: "14:00", children: "2:00 PM" }), _jsx(SelectItem, { value: "15:00", children: "3:00 PM" }), _jsx(SelectItem, { value: "16:00", children: "4:00 PM" }), _jsx(SelectItem, { value: "17:00", children: "5:00 PM" }), _jsx(SelectItem, { value: "18:00", children: "6:00 PM" }), _jsx(SelectItem, { value: "20:00", children: "8:00 PM" }), _jsx(SelectItem, { value: "22:00", children: "10:00 PM" })] })] })] }), _jsxs(Button, { onClick: handleScheduleAllOffDuty, className: "w-full bg-orange-500 hover:bg-orange-600", children: [_jsx(Timer, { className: "w-4 h-4 mr-2" }), "Schedule All Off-Duty"] }), _jsxs("p", { className: "text-xs text-muted-foreground text-center", children: ["All ", onDutyOfficers.length, " on-duty officer", onDutyOfficers.length > 1 ? 's' : '', " will automatically go off-duty tomorrow at the selected time."] })] }) })] })) })] }) }), _jsxs(CardContent, { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentMonth(subMonths(currentMonth, 1)), children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsx("h3", { className: "text-lg font-semibold text-blue-900", children: format(currentMonth, 'MMMM yyyy') }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentMonth(addMonths(currentMonth, 1)), children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "grid grid-cols-7 gap-1 mb-2", children: weekDays.map((day) => (_jsx("div", { className: "text-center text-sm font-semibold text-gray-600 py-2", children: day }, day))) }), _jsx("div", { className: "grid grid-cols-7 gap-1", children: calendarDays.map((day, idx) => {
                                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                                        const isToday = isSameDay(day, new Date());
                                                        const officersOnDuty = getOfficersOnDutyForDate(day);
                                                        const hasOfficers = officersOnDuty.length > 0;
                                                        return (_jsxs("button", { onClick: () => handleDateClick(day), className: `
                            aspect-square p-2 rounded-lg border transition-all hover:scale-105
                            ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                            ${isToday ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                            ${hasOfficers ? 'hover:bg-green-50 hover:border-green-300' : 'hover:bg-blue-50 hover:border-blue-300'}
                          `, children: [_jsx("div", { className: "text-sm font-medium", children: format(day, 'd') }), hasOfficers && (_jsx("div", { className: "mt-1", children: _jsx(Badge, { className: "bg-green-500 text-white text-xs px-1.5 py-0", children: officersOnDuty.length }) }))] }, idx));
                                                    }) }), _jsxs("div", { className: "mt-4 flex items-center gap-4 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 bg-green-500 rounded-full" }), _jsx("span", { children: "Has officers on duty" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 border-2 border-blue-500 rounded-full" }), _jsx("span", { children: "Today" })] })] })] })] }) })] }), _jsx("div", { className: "mt-8 text-center text-sm text-gray-500", children: _jsxs("div", { className: "flex items-center justify-center gap-6 flex-wrap", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "w-4 h-4" }), "BCPS-1"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Phone, { className: "w-4 h-4" }), "Emergency: 911"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(CalendarIcon, { className: "w-4 h-4" }), format(new Date(), 'MMMM d, yyyy')] })] }) })] }), _jsx(Dialog, { open: dayDetailsOpen, onOpenChange: setDayDetailsOpen, children: _jsxs(DialogContent, { className: "sm:max-w-lg max-h-[80vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsxs(DialogTitle, { className: "flex items-center gap-2", children: [_jsx(CalendarDays, { className: "w-5 h-5" }), selectedDate && format(selectedDate, 'MMMM d, yyyy'), _jsxs(Button, { size: "sm", variant: "outline", className: "ml-auto h-8", onClick: () => {
                                                setDayDetailsOpen(false);
                                                setAssignDialogOpen(true);
                                            }, children: [_jsx(UserPlus, { className: "w-4 h-4 mr-1" }), "Add"] })] }), _jsx(DialogDescription, { children: "Officers on duty for this day. Click + on calendar to assign." })] }), selectedDate && (_jsx("div", { className: "py-4", children: (() => {
                                const officersOnDuty = getOfficersOnDutyForDate(selectedDate);
                                if (officersOnDuty.length === 0) {
                                    return (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx(UserX, { className: "w-12 h-12 mx-auto mb-3 text-gray-300" }), _jsx("p", { children: "No officers on duty this day" })] }));
                                }
                                return (_jsx("div", { className: "space-y-3", children: officersOnDuty.map((officer) => {
                                        const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                        // Find duty record from Supabase or local history
                                        let dutyRecord;
                                        let dutyRecordId;
                                        if (dutyRecords && dutyRecords.length > 0) {
                                            const sbRecord = dutyRecords.find((r) => r.officer_id === officer.id && r.duty_date === dateStr);
                                            if (sbRecord) {
                                                dutyRecordId = sbRecord.id;
                                                // Format the time strings to match local format
                                                dutyRecord = {
                                                    timeIn: formatTime(sbRecord.time_in) || sbRecord.time_in,
                                                    timeOut: formatTime(sbRecord.time_out) || sbRecord.time_out,
                                                };
                                            }
                                        }
                                        else {
                                            dutyRecord = officer.dutyHistory?.find((r) => r.date === dateStr);
                                        }
                                        return (_jsxs("div", { className: "flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200", children: [_jsxs("div", { children: [_jsxs("div", { className: "font-medium flex items-center gap-2", children: [officer.name, _jsx(Badge, { className: officer.currentStatus === 'on-duty'
                                                                        ? 'bg-green-500 text-white text-xs'
                                                                        : 'bg-gray-400 text-white text-xs', children: officer.currentStatus === 'on-duty' ? 'On Duty' : 'Off Duty' })] }), _jsxs("div", { className: "text-sm text-gray-600", children: [officer.rank, ' ', officer.badgeNumber && `• Badge #${officer.badgeNumber}`] }), _jsx("div", { className: "text-xs text-gray-500", children: officer.unit })] }), _jsxs("div", { className: "text-right flex items-center gap-1", children: [dutyRecord && (_jsxs("div", { className: "text-green-700 flex items-center gap-1", children: [_jsx(Clock, { className: "w-3 h-3" }), "Checked In"] })), dutyRecord && (_jsx(Button, { size: "sm", variant: "ghost", onClick: (e) => {
                                                                e.stopPropagation();
                                                                if (dutyRecordId) {
                                                                    setDeleteDutyDialog({ open: true, dutyRecordId });
                                                                }
                                                            }, className: "h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0", title: "Remove duty record", children: _jsx(Trash2, { className: "w-4 h-4" }) }))] })] }, officer.id));
                                    }) }));
                            })() })), _jsx(DialogFooter, { children: _jsx(Button, { onClick: () => setDayDetailsOpen(false), variant: "outline", children: "Close" }) })] }) }), _jsx(Dialog, { open: assignDialogOpen, onOpenChange: setAssignDialogOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Assign Officer to Duty" }), _jsxs(DialogDescription, { children: ["Assign an officer to duty on ", selectedDate && format(selectedDate, 'MMMM d, yyyy')] })] }), _jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Officer" }), _jsxs(Select, { value: selectedOfficerId, onValueChange: setSelectedOfficerId, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select officer" }) }), _jsx(SelectContent, { children: (() => {
                                                    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
                                                    const officersOnDutyIds = new Set(getOfficersOnDutyForDate(selectedDate || new Date()).map((o) => o.id));
                                                    const availableOfficers = officers.filter((o) => !officersOnDutyIds.has(o.id));
                                                    return availableOfficers.map((officer) => (_jsxs(SelectItem, { value: officer.id, children: [officer.name, " (", officer.rank, ")"] }, officer.id)));
                                                })() })] })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setAssignDialogOpen(false), children: "Cancel" }), _jsx(Button, { onClick: async () => {
                                        if (!selectedDate || !selectedOfficerId) {
                                            toast.error('Please select an officer');
                                            return;
                                        }
                                        try {
                                            const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                            console.log('Assigning officer:', selectedOfficerId, 'for date:', dateStr);
                                            await addDutyRecord(selectedOfficerId, dateStr, undefined, undefined, undefined);
                                            toast.success('Officer assigned to duty');
                                            setAssignDialogOpen(false);
                                            // Reset form
                                            setSelectedOfficerId('');
                                            setNotes('');
                                        }
                                        catch (error) {
                                            console.error('Assign error:', error);
                                            toast.error(error?.message || 'Failed to assign duty');
                                        }
                                    }, disabled: !selectedOfficerId || loading, children: "Assign Duty" })] })] }) }), _jsx(Dialog, { open: !!editingOfficer, onOpenChange: () => setEditingOfficer(null), children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Edit Officer Information" }), _jsx(DialogDescription, { children: "Update the officer's details below." })] }), editingOfficer && (_jsxs("div", { className: "space-y-4 py-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Full Name" }), _jsx(Input, { value: editingOfficer.name, onChange: (e) => setEditingOfficer({ ...editingOfficer, name: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Rank" }), _jsx(Input, { value: editingOfficer.rank, onChange: (e) => setEditingOfficer({ ...editingOfficer, rank: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Badge Number" }), _jsx(Input, { value: editingOfficer.badgeNumber || '', onChange: (e) => setEditingOfficer({ ...editingOfficer, badgeNumber: e.target.value }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium", children: "Unit/Station" }), _jsx(Input, { value: editingOfficer.unit, onChange: (e) => setEditingOfficer({ ...editingOfficer, unit: e.target.value }) })] })] })), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setEditingOfficer(null), children: "Cancel" }), _jsx(Button, { onClick: saveEdit, className: "bg-blue-700 hover:bg-blue-800", disabled: loading, children: "Save Changes" })] })] }) }), _jsx(Dialog, { open: deleteDutyDialog.open, onOpenChange: () => setDeleteDutyDialog({ ...deleteDutyDialog, open: false }), children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Confirm Remove Duty Record" }), _jsx(DialogDescription, { children: "Are you sure you want to remove this duty record? This cannot be undone." })] }), _jsxs(DialogFooter, { className: "gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteDutyDialog({ ...deleteDutyDialog, open: false }), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: async () => {
                                        const success = await deleteDutyRecord(deleteDutyDialog.dutyRecordId);
                                        setDeleteDutyDialog({ open: false, dutyRecordId: '' });
                                        if (success) {
                                            toast.success('Duty record removed');
                                        }
                                        else {
                                            toast.error('Failed to remove duty record');
                                        }
                                    }, disabled: loading, children: "Remove Record" })] })] }) }), _jsx(Dialog, { open: deleteDialogOpen, onOpenChange: setDeleteDialogOpen, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Confirm Remove" }), _jsx(DialogDescription, { children: "Are you sure you want to remove this officer from the officer list?" })] }), _jsxs(DialogFooter, { className: "gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteDialogOpen(false), children: "Cancel" }), _jsx(Button, { variant: "destructive", onClick: confirmDelete, disabled: loading, children: "Remove" })] })] }) })] }));
}
export default App;
