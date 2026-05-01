import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Shield,
  UserCheck,
  UserX,
  UserPlus,
  Trash2,
  Edit2,
  Search,
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  Timer,
  Download,
  Lock,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import * as XLSX from 'xlsx'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'

// Removed time-utils import - using native Date() and date-fns
// getCurrentTime -> new Date()
// getTomorrowAtTime(timeStr) -> custom inline
// formatDbTime -> native formatting

// Scheduler imports
import { useUnifiedData, type AppOfficer } from './hooks/use-unified-data'
import { ScheduleOffDutyButton } from './components/ScheduleOffDutyButton'

// Type for editing officer
interface EditingOfficer {
  id: string
  name: string
  rank: string
  badgeNumber?: string
  unit: string
}

function App() {
  // Use unified data hook (handles both Supabase and localStorage)
  const {
    officers,
    dutyRecords,
    deleteDutyRecord,
    addDutyRecord,
    loading,
    realtimeStatus,
    addOfficer,
    updateOfficer,
    deleteOfficer,
    checkInOfficer,
    checkOutOfficer,
    scheduleTask,
    cancelTask,
    getTaskForOfficer,
    refreshData,
  } = useUnifiedData()

  // Form state
  const [name, setName] = useState('')
  const [rank, setRank] = useState('')
  const [badgeNumber, setBadgeNumber] = useState('')
  const [unit, setUnit] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingOfficer, setEditingOfficer] = useState<EditingOfficer | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [officerToDelete, setOfficerToDelete] = useState<string | null>(null)
  const [deleteDutyDialog, setDeleteDutyDialog] = useState<{ open: boolean; dutyRecordId: string }>(
    { open: false, dutyRecordId: '' },
  )

  // Permission state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Schedule Off-Duty state
  const [scheduleTime, setScheduleTime] = useState<string>('08:00')
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false)

  // Refresh data when component mounts
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Handle password authentication
  const handlePasswordSubmit = () => {
    if (passwordInput === 'bcpo') {
      setIsAuthenticated(true)
      setShowPasswordDialog(false)
      setPasswordInput('')
      toast.success('Access granted')
    } else {
      toast.error('Incorrect password')
      setPasswordInput('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setName('')
    setRank('')
    setBadgeNumber('')
    setUnit('')
    toast.success('Logged out')
  }

  // Handle add officer
  const handleAddOfficer = async () => {
    if (!name.trim()) {
      toast.error('Please enter officer name')
      return
    }
    if (!rank.trim()) {
      toast.error('Please enter rank')
      return
    }

    try {
      await addOfficer(name.trim(), rank.trim(), badgeNumber.trim(), unit.trim())
      setName('')
      setRank('')
      setBadgeNumber('')
      setUnit('')
      toast.success('Officer registered successfully')
    } catch {
      toast.error('Failed to register officer')
    }
  }

  // Handle on duty
  const handleOnDuty = async (officerId: string) => {
    const officer = officers.find((o) => o.id === officerId)
    if (!officer) return

    try {
      await checkInOfficer(officerId)

      // Automatically schedule off-duty for tomorrow at 8:00 AM
      const tomorrow = (() => {
        const now = new Date()
        const phTime = new Date(now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))
        phTime.setDate(phTime.getDate() + 1)
        phTime.setHours(8, 0, 0, 0)
        return phTime
      })()

      await scheduleTask(officerId, officer.name, 'off-duty', tomorrow)

      toast.success(`${officer.name} is now ON DUTY`, {
        description: 'Auto-scheduled off-duty for tomorrow at 8:00 AM',
      })
    } catch {
      toast.error('Failed to check in officer')
    }
  }

  // Handle off duty
  const handleOffDuty = async (officerId: string) => {
    console.log('handleOffDuty called for:', officerId)
    try {
      const result = await checkOutOfficer(officerId)
      console.log('checkOutOfficer result:', result)
      if (result) {
        toast.success('Officer is now OFF DUTY')
      } else {
        toast.error('Failed to check out officer')
      }
    } catch (error) {
      console.error('handleOffDuty error:', error)
      toast.error('Failed to check out officer')
    }
  }

  // Handle delete
  const handleDelete = (officerId: string) => {
    setOfficerToDelete(officerId)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (officerToDelete) {
      try {
        await deleteOfficer(officerToDelete)
        toast.success('Officer removed from logbook')
        setDeleteDialogOpen(false)
        setOfficerToDelete(null)
      } catch {
        toast.error('Failed to remove officer')
      }
    }
  }

  // Handle edit
  const handleEdit = (officer: AppOfficer) => {
    setEditingOfficer({
      id: officer.id,
      name: officer.name,
      rank: officer.rank,
      badgeNumber: officer.badgeNumber,
      unit: officer.unit,
    })
  }

  // Save edit
  const saveEdit = async () => {
    if (editingOfficer) {
      if (!editingOfficer.name.trim()) {
        toast.error('Name cannot be empty')
        return
      }
      if (!editingOfficer.rank.trim()) {
        toast.error('Rank cannot be empty')
        return
      }
      try {
        await updateOfficer(editingOfficer.id, {
          name: editingOfficer.name.trim(),
          rank: editingOfficer.rank.trim(),
          badgeNumber: editingOfficer.badgeNumber?.trim(),
          unit: editingOfficer.unit.trim(),
        })
        setEditingOfficer(null)
        toast.success('Officer information updated')
      } catch {
        toast.error('Failed to update officer')
      }
    }
  }

  // Get officers on duty for a specific date
  const getOfficersOnDutyForDate = (date: Date): AppOfficer[] => {
    const dateStr = format(date, 'yyyy-MM-dd')

    // Use Supabase duty records if available
    if (dutyRecords && dutyRecords.length > 0) {
      const officerIdsOnDuty = dutyRecords
        .filter((record) => record.duty_date === dateStr)
        .map((record) => record.officer_id)
      return officers.filter((officer) => officerIdsOnDuty.includes(officer.id))
    }

    // Fallback to local duty history
    return officers.filter((officer) =>
      officer.dutyHistory?.some((record) => record.date === dateStr),
    )
  }

  // Calendar generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    const days = []
    let day = calendarStart

    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [currentMonth])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setDayDetailsOpen(true)
  }

  const handleAssignClick = (date: Date) => {
    setSelectedDate(date)
    setAssignDialogOpen(true)
  }

  const onDutyOfficers = officers.filter((o) => o.currentStatus === 'on-duty')
  const offDutyOfficers = officers.filter((o) => o.currentStatus === 'off-duty')

  const handleScheduleAllOffDuty = useCallback(async () => {
    const scheduledTime = (() => {
      const [hours, minutes] = scheduleTime.split(':').map(Number)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(hours, minutes, 0, 0)
      return tomorrow
    })()

    const now = new Date()

    if (scheduledTime <= now) {
      toast.error('Selected time has already passed')
      return
    }

    if (onDutyOfficers.length === 0) {
      toast.error('No officers are currently on duty')
      return
    }

    // Schedule off-duty for all on-duty officers
    for (const officer of onDutyOfficers) {
      await scheduleTask(officer.id, officer.name, 'off-duty', scheduledTime)
    }

    const timeLabel = new Date(`2000-01-01T${scheduleTime}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    toast.success(
      `Scheduled ${onDutyOfficers.length} officer${onDutyOfficers.length > 1 ? 's' : ''} to go off-duty tomorrow at ${timeLabel}`,
    )
    setIsSchedulePopoverOpen(false)
  }, [onDutyOfficers, scheduleTime, scheduleTask])

  const filteredOfficers = officers.filter(
    (officer) =>
      officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.badgeNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Helper to format Supabase time (HH:MM:SS) to 12-hour format - times stored as UTC, add 8 for PH display
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':').map(Number)
    // Add 8 hours for Philippine timezone
    let adjustedHours = (hours + 8) % 24
    const hour12 = adjustedHours % 12 || 12
    const ampm = adjustedHours >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

   // Get countdown for a scheduled task
   const getCountdown = (scheduledTime: string) => {
     const now = new Date()
     const scheduled = new Date(scheduledTime)
     const diff = scheduled.getTime() - now.getTime()

     if (diff <= 0) {
       return {
         days: 0,
         hours: 0,
         minutes: 0,
         seconds: 0,
         totalMilliseconds: 0,
         isExpired: true,
       }
     }

     const days = Math.floor(diff / (1000 * 60 * 60 * 24))
     const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
     const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
     const seconds = Math.floor((diff % (1000 * 60)) / 1000)

     return {
       days,
       hours,
       minutes,
       seconds,
       totalMilliseconds: diff,
       isExpired: false,
     }
   }

   // Export officers to Excel
   const exportToExcel = () => {
     // Helper to convert UTC time to PHT (UTC+8)
     const convertToPHT = (utcTime?: string | null) => {
       if (!utcTime) return ''
       const [hours, minutes, seconds] = utcTime.split(':').map(Number)
       let phtHours = (hours + 8) % 24
       const ampm = phtHours >= 12 ? 'PM' : 'AM'
       phtHours = phtHours % 12 || 12
       return `${phtHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`
     }

     // Helper to format date
     const formatDate = (dateStr: string) => {
       const date = new Date(dateStr)
       return format(date, 'MMM dd, yyyy')
     }

     // Sheet 1: Officers
     const officersData = officers.map((officer) => ({
       Name: officer.name,
       Rank: officer.rank,
       'Badge Number': officer.badgeNumber || '',
       Unit: officer.unit,
       Status: officer.currentStatus === 'on-duty' ? 'On Duty' : 'Off Duty',
       'Duty Records Count': officer.dutyHistory.length,
     }))

     // Sheet 2: Duty History (all check-ins/check-outs)
     const dutyHistoryData: any[] = []
     officers.forEach((officer) => {
       officer.dutyHistory.forEach((record) => {
         dutyHistoryData.push({
           'Officer Name': officer.name,
           Rank: officer.rank,
           'Badge Number': officer.badgeNumber || '',
           Unit: officer.unit,
           Date: formatDate(record.date),
           'Time In (PHT)': convertToPHT(record.timeIn),
           'Time Out (PHT)': convertToPHT(record.timeOut),
           Duration: record.timeOut 
             ? `${Math.floor((new Date(`2000-01-01T${record.timeOut}`).getTime() - new Date(`2000-01-01T${record.timeIn}`).getTime()) / (1000 * 60 * 60))}h ${Math.floor(((new Date(`2000-01-01T${record.timeOut}`).getTime() - new Date(`2000-01-01T${record.timeIn}`).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m`
             : 'Ongoing',
         })
       })
     })

     // Sheet 3: Statistics Summary
     const today = format(new Date(), 'yyyy-MM-dd')
     const todayOnDuty = officers.filter((o) => o.currentStatus === 'on-duty').length
     const todayRecords = dutyHistoryData.filter((r) => r.Date === formatDate(today)).length

     const summaryData = [
       { Metric: 'Total Officers', Value: officers.length },
       { Metric: 'Currently On Duty', Value: todayOnDuty },
       { Metric: 'Currently Off Duty', Value: officers.length - todayOnDuty },
       { Metric: 'Total Duty Records', Value: dutyHistoryData.length },
       { Metric: "Today's Duty Sessions", Value: todayRecords },
       { Metric: 'Export Date', Value: format(new Date(), 'MMM dd, yyyy HH:mm:ss') },
     ]

     // Create workbook
     const workbook = XLSX.utils.book_new()

     const wsOfficers = XLSX.utils.json_to_sheet(officersData)
     XLSX.utils.book_append_sheet(workbook, wsOfficers, 'Officers')

     const wsDutyHistory = XLSX.utils.json_to_sheet(dutyHistoryData)
     XLSX.utils.book_append_sheet(workbook, wsDutyHistory, 'Duty History')

     const wsSummary = XLSX.utils.json_to_sheet(summaryData)
     XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary')

     // Auto-set column widths
     wsOfficers['!cols'] = [
       { wch: 25 }, // Name
       { wch: 12 }, // Rank
       { wch: 14 }, // Badge Number
       { wch: 15 }, // Unit
       { wch: 12 }, // Status
       { wch: 18 }, // Duty Records Count
     ]

     wsDutyHistory['!cols'] = [
       { wch: 20 }, // Officer Name
       { wch: 10 }, // Rank
       { wch: 14 }, // Badge Number
       { wch: 15 }, // Unit
       { wch: 12 }, // Date
       { wch: 16 }, // Time In
       { wch: 16 }, // Time Out
       { wch: 12 }, // Duration
     ]

     XLSX.writeFile(workbook, `BCPO_Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
     toast.success('Exported complete attendance report to Excel')
   }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="relative w-full overflow-hidden shadow-lg bg-blue-900">
      {/* 1. The Building Background - Reduced width to 30% of the header */}
        <div 
           className="absolute right-0 top-0 h-full w-[30%] z-0 bg-no-repeat bg-cover bg-right opacity-80"
           style={{ backgroundImage: "url('/screenshots/2d5b1f5a-4211-4f1e-b114-bb9fa943f1c0-removebg-preview.png')",}} />

      {/* 2. Adjusted Gradient Overlay */}
      {/* 'via-50%' ensures the solid color stays solid longer before fading into the image */}
         <div className="absolute inset-0 z-10 bg-gradient-to-r from-blue-900 via-blue-900/90 via-50% to-blue-900/30"></div>

      {/* 3. Your Original Content Layout */}
         <div className="relative z-20 container mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-4">
              <img
                 src="/pnp_logo_nobg.png"
                 alt="Philippine National Police"
                 className="h-16 md:h-20 object-contain drop-shadow-md"/>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-white drop-shadow-md"> BCPO Attendance Tracker
              </h1>
         </div>
              <img 
                src="/BCPO_LOGO_nobg.png" 
                alt="BCPO" 
                className="h-16 md:h-20 object-contain drop-shadow-md"/>
           </div>
        </div>
    </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Stats Cards */}
        <Card className="border-2 border-blue-200/50 shadow-2xl bg-white/80 backdrop-blur-xl hover:shadow-3xl transition-all duration-300 mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50/80 to-white/80 border-b border-blue-200/50 py-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-bold text-blue-900">
                OFFICERS SUMMARY
              </h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={exportToExcel}
                className="inline-flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 border-transparent shadow-lg shadow-green-200/50 transition-all duration-300"
                title="Download Excel"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">ON DUTY NOW</p>
                <p className="text-4xl font-bold">{onDutyOfficers.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <UserCheck className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-gray-100 text-sm font-medium">OFF DUTY</p>
                <p className="text-4xl font-bold">{offDutyOfficers.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <UserX className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">TOTAL OFFICERS</p>
                <p className="text-4xl font-bold">{officers.length}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                <Users className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Officer Management */}
          <div className="space-y-6">
            {/* Search */}
            <div className="relative search-wrapper">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 search-icon transition-all duration-300" />
              <Input
                placeholder="Search officers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-2 border-gray-200 h-10 text-sm search-input focus:border-blue-500 focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Add Officer Card */}
            <Card className="border-2 border-blue-200/50 shadow-2xl bg-white/80 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50/80 to-white/80 border-b border-blue-200/50 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
                    <UserPlus className="w-4 h-4" />
                    Register New Officer
                  </CardTitle>
                  {isAuthenticated && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLogout}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 h-8 px-3 text-xs font-semibold"
                      title="Logout"
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Logout
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {!isAuthenticated ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="flex justify-center mb-3">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Lock className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Enter password to access officer registration
                    </div>
                     <div className="flex gap-2 justify-center">
                       <div className="relative">
                         <Input
                           type={showPassword ? "text" : "password"}
                           placeholder="Enter password"
                           value={passwordInput}
                           onChange={(e) => setPasswordInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                           className="border-blue-200 h-9 text-sm w-48 pr-10"
                         />
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                         >
                           {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </Button>
                       </div>
                       <Button
                         onClick={handlePasswordSubmit}
                         size="sm"
                         className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 border-0 rounded-lg px-4 py-2"
                       >
                         Access
                       </Button>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Full Name *</label>
                        <Input
                          placeholder="Enter name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="border-blue-200 h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Rank *</label>
                        <Input
                          placeholder="e.g., PO1"
                          value={rank}
                          onChange={(e) => setRank(e.target.value)}
                          className="border-blue-200 h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Badge #</label>
                        <Input
                          placeholder="e.g., 12345"
                          value={badgeNumber}
                          onChange={(e) => setBadgeNumber(e.target.value)}
                          className="border-blue-200 h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Unit</label>
                        <Input
                          placeholder="e.g., Station 1"
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="border-blue-200 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={handleAddOfficer}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 border-0 rounded-lg px-4 py-2"
                        disabled={loading}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Register
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Officer List */}
            <Card className="border-2 border-blue-200/50 shadow-2xl bg-white/80 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50/80 to-white/80 border-b border-blue-200/50 py-3 backdrop-blur-sm">
                <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
                  <Users className="w-4 h-4" />
                  Officers List
                  <Badge className="ml-2 text-xs bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-green-500/50 font-bold px-2.5 py-1 rounded-full">
                    {filteredOfficers.length}
                  </Badge>
                  {/* Realtime Status Indicator */}
                  <span
                    className={`ml-auto w-3 h-3 rounded-full animate-pulse ${
                      realtimeStatus === 'connected'
                        ? 'bg-green-500 shadow-lg shadow-green-500/50'
                        : realtimeStatus === 'reconnecting'
                          ? 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                          : 'bg-gray-400'
                    }`}
                    title={`Realtime: ${realtimeStatus}`}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-80 overflow-y-auto">
                {filteredOfficers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No officers registered</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredOfficers.map((officer) => (
                      <div key={officer.id} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{officer.name}</span>
                              {officer.currentStatus === 'on-duty' ? (
                                <Badge className="bg-green-500 text-white text-xs">On Duty</Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-500 text-xs">
                                  Off Duty
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {officer.rank} {officer.badgeNumber && `• #${officer.badgeNumber}`}{' '}
                              {officer.unit && `• ${officer.unit}`}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {officer.currentStatus === 'off-duty' ? (
                              <Button
                                size="sm"
                                onClick={() => handleOnDuty(officer.id)}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white h-7 px-3 text-xs font-semibold shadow-lg hover:shadow-green-500/50 hover:scale-105 transform transition-all duration-300 border-0 rounded"
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                On
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleOffDuty(officer.id)}
                                  variant="outline"
                                  className="bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-500 hover:to-slate-600 border-0 h-7 px-3 text-xs font-semibold shadow-lg hover:shadow-slate-500/50 hover:scale-105 transform transition-all duration-300 rounded"
                                >
                                  <UserX className="w-3 h-3 mr-1" />
                                  Off
                                </Button>
                                <ScheduleOffDutyButton
                                  officerId={officer.id}
                                  officerName={officer.name}
                                  currentStatus={officer.currentStatus}
                                  scheduledTask={getTaskForOfficer(officer.id)}
                                  onSchedule={scheduleTask}
                                  onCancelSchedule={cancelTask}
                                  getCountdown={getCountdown}
                                  compact
                                />
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(officer)}
                              className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-7 w-7 p-0 rounded-full hover:scale-110 transform transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(officer.id)}
                              className="text-red-600 hover:bg-red-100 hover:text-red-700 h-7 w-7 p-0 rounded-full hover:scale-110 transform transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar & Scheduled Tasks */}
          <div className="space-y-6">
            {/* Duty Calendar with Scheduled Off-Duty */}
            <Card className="border-2 border-blue-200/50 shadow-2xl bg-white/80 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50/80 to-white/80 border-b border-blue-200/50 backdrop-blur-sm">
                <CardTitle className="flex items-center justify-between text-blue-900">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Duty Calendar
                  </div>
                  <div className="flex items-center gap-2">
                    {onDutyOfficers.length > 0 && (
                      <Popover open={isSchedulePopoverOpen} onOpenChange={setIsSchedulePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 border-0 h-8 px-3 text-xs font-semibold shadow-lg hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 rounded"
                            title="Schedule off-duty for all on-duty officers"
                          >
                            <Timer className="w-3 h-3 mr-1" />
                            Schedule Off-Duty
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-sm">Schedule Off-Duty</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Schedule all {onDutyOfficers.length} on-duty officer
                                {onDutyOfficers.length > 1 ? 's' : ''} for tomorrow
                              </p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-700">
                                Select Time (Default: 8:00 AM)
                              </label>
                              <Select value={scheduleTime} onValueChange={setScheduleTime}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="06:00">6:00 AM</SelectItem>
                                  <SelectItem value="07:00">7:00 AM</SelectItem>
                                  <SelectItem value="08:00">8:00 AM (Default)</SelectItem>
                                  <SelectItem value="09:00">9:00 AM</SelectItem>
                                  <SelectItem value="10:00">10:00 AM</SelectItem>
                                  <SelectItem value="14:00">2:00 PM</SelectItem>
                                  <SelectItem value="15:00">3:00 PM</SelectItem>
                                  <SelectItem value="16:00">4:00 PM</SelectItem>
                                  <SelectItem value="17:00">5:00 PM</SelectItem>
                                  <SelectItem value="18:00">6:00 PM</SelectItem>
                                  <SelectItem value="20:00">8:00 PM</SelectItem>
                                  <SelectItem value="22:00">10:00 PM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              onClick={handleScheduleAllOffDuty}
                              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 border-0 rounded-lg"
                            >
                              <Timer className="w-4 h-4 mr-2" />
                              Schedule All Off-Duty
                            </Button>

                            <p className="text-xs text-muted-foreground text-center">
                              All {onDutyOfficers.length} on-duty officer
                              {onDutyOfficers.length > 1 ? 's' : ''} will automatically go off-duty
                              tomorrow at the selected time.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-gradient-to-br from-blue-50/60 via-white/80 to-blue-50/40 relative overflow-hidden calendar-content">
                {/* Animated backdrop gradient elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-200/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-200/5 to-transparent rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none"></div>
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
                <div className="relative z-10">
                {/* Calendar Header */}
                <div className="flex items-center justify-center mb-4 relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="absolute left-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center justify-center gap-3">
                    <h3 className="text-lg font-semibold text-blue-900">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 p-2 rounded-lg"
                          title="Select Date"
                        >
                          <CalendarIcon className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl" align="center">
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-700">Select Date</label>
                          <input
                            type="date"
                            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const date = new Date(e.target.value)
                              setSelectedDate(date)
                              setCurrentMonth(date)
                            }}
                            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-600 text-sm"
                          />
                          <div className="text-xs text-gray-600 text-center pt-2">
                            {selectedDate ? format(selectedDate, 'MM/dd/yyyy') : format(new Date(), 'MM/dd/yyyy')}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="absolute right-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Week Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day, idx) => (
                    <div key={day} className={`text-center text-sm font-semibold py-2 uppercase tracking-wide ${idx === 0 ? 'text-red-600' : 'text-blue-900'}`}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isToday = isSameDay(day, new Date())
                    const isSunday = idx % 7 === 0
                    const officersOnDuty = getOfficersOnDutyForDate(day)
                    const hasOfficers = officersOnDuty.length > 0

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDateClick(day)}
                        className={`
                            aspect-square p-2 rounded-lg border transition-all hover:scale-105
                            ${isSunday ? 'bg-white text-red-500 border-red-300/50' : (isCurrentMonth ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-400')}
                            ${isToday ? 'ring-2 ring-blue-500 border-blue-500' : isSunday ? 'border-red-300/30' : 'border-gray-200'}
                            ${hasOfficers ? 'hover:bg-green-100 hover:border-green-300' : isSunday ? 'hover:bg-red-50 hover:border-red-300' : 'hover:bg-blue-50 hover:border-blue-300'}
                          `}
                      >
                        <div className={`text-sm font-medium ${isSunday ? 'text-red-600 font-bold' : 'text-gray-900'}`}>{format(day, 'd')}</div>
                        {hasOfficers && (
                          <div className="mt-1">
                            <Badge className="bg-green-500 text-white text-xs px-1.5 py-0">
                              {officersOnDuty.length}
                            </Badge>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Has officers on duty</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-blue-500 rounded-full"></div>
                    <span>Today</span>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              BCPS-1
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              Emergency: 911
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
        </div>
      </main>

      {/* Day Details Dialog */}
      <Dialog open={dayDetailsOpen} onOpenChange={setDayDetailsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300"
                onClick={() => {
                  setDayDetailsOpen(false)
                  setAssignDialogOpen(true)
                }}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTitle>
            <DialogDescription>
              Officers on duty for this day. Click + on calendar to assign.
            </DialogDescription>
          </DialogHeader>

          {selectedDate && (
            <div className="py-4">
              {(() => {
                const officersOnDuty = getOfficersOnDutyForDate(selectedDate)
                if (officersOnDuty.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No officers on duty this day</p>
                    </div>
                  )
                }
                return (
                  <div className="space-y-3">
                    {officersOnDuty.map((officer) => {
                      const dateStr = format(selectedDate, 'yyyy-MM-dd')

                      // Find duty record from Supabase or local history
                      let dutyRecord: { timeIn: string; timeOut: string | null } | undefined
                      let dutyRecordId: string | undefined
                      if (dutyRecords && dutyRecords.length > 0) {
                        const sbRecord = dutyRecords.find(
                          (r) => r.officer_id === officer.id && r.duty_date === dateStr,
                        )
                        if (sbRecord) {
                          dutyRecordId = sbRecord.id
                          // Format the time strings to match local format
                          dutyRecord = {
                            timeIn: formatTime(sbRecord.time_in) || sbRecord.time_in,
                            timeOut: formatTime(sbRecord.time_out) || sbRecord.time_out,
                          }
                        }
                      } else {
                        dutyRecord = officer.dutyHistory?.find((r) => r.date === dateStr)
                      }

                      return (
                        <div
                          key={officer.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {officer.name}
                              <Badge
                                className={
                                  officer.currentStatus === 'on-duty'
                                    ? 'bg-green-500 text-white text-xs'
                                    : 'bg-gray-400 text-white text-xs'
                                }
                              >
                                {officer.currentStatus === 'on-duty' ? 'On Duty' : 'Off Duty'}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {officer.rank}{' '}
                              {officer.badgeNumber && `• Badge #${officer.badgeNumber}`}
                            </div>
                            <div className="text-xs text-gray-500">{officer.unit}</div>
                          </div>
                          <div className="text-right flex items-center gap-1">
                            {dutyRecord && (
                              <div className="text-green-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Checked In
                              </div>
                            )}
                            {dutyRecord && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (dutyRecordId) {
                                    setDeleteDutyDialog({ open: true, dutyRecordId })
                                  }
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                                title="Remove duty record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDayDetailsOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Duty Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Assign Officer to Duty</DialogTitle>
            <DialogDescription>
              Assign an officer to duty on {selectedDate && format(selectedDate!, 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Officer</label>
              <Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
                    const officersOnDutyIds = new Set(
                      getOfficersOnDutyForDate(selectedDate || new Date()).map((o) => o.id),
                    )
                    const availableOfficers = officers.filter((o) => !officersOnDutyIds.has(o.id))
                    return availableOfficers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.name} ({officer.rank})
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedDate || !selectedOfficerId) {
                  toast.error('Please select an officer')
                  return
                }
                try {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd')
                  console.log('Assigning officer:', selectedOfficerId, 'for date:', dateStr)
                  await addDutyRecord(selectedOfficerId, dateStr, undefined, undefined, undefined)
                  toast.success('Officer assigned to duty')
                  setAssignDialogOpen(false)
                  // Reset form
                  setSelectedOfficerId('')
                  setNotes('')
                } catch (error: any) {
                  console.error('Assign error:', error)
                  toast.error(error?.message || 'Failed to assign duty')
                }
              }}
              disabled={!selectedOfficerId || loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Duty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingOfficer} onOpenChange={() => setEditingOfficer(null)}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Officer Information</DialogTitle>
            <DialogDescription>Update the officer's details below.</DialogDescription>
          </DialogHeader>
          {editingOfficer && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={editingOfficer.name}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rank</label>
                <Input
                  value={editingOfficer.rank}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, rank: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Badge Number</label>
                <Input
                  value={editingOfficer.badgeNumber || ''}
                  onChange={(e) =>
                    setEditingOfficer({ ...editingOfficer, badgeNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit/Station</label>
                <Input
                  value={editingOfficer.unit}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, unit: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOfficer(null)}>
              Cancel
            </Button>
            <Button 
              onClick={saveEdit} 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform transition-all duration-300 border-0 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Duty Record Confirmation Dialog */}
      <Dialog
        open={deleteDutyDialog.open}
        onOpenChange={() => setDeleteDutyDialog({ ...deleteDutyDialog, open: false })}
      >
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Remove Duty Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this duty record? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDutyDialog({ ...deleteDutyDialog, open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const success = await deleteDutyRecord(deleteDutyDialog.dutyRecordId)
                setDeleteDutyDialog({ open: false, dutyRecordId: '' })
                if (success) {
                  toast.success('Duty record removed')
                } else {
                  toast.error('Failed to remove duty record')
                }
              }}
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 transform transition-all duration-300 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Remove</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this officer from the officer list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 transform transition-all duration-300 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
