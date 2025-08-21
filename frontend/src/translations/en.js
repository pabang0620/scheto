const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    name: 'Name',
    email: 'Email',
    department: 'Department',
    position: 'Position',
    role: 'Role',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    actions: 'Actions',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    viewAll: 'View All',
    noData: 'No data available',
    refresh: 'Refresh',
    filter: 'Filter',
    active: 'Active',
    inactive: 'Inactive',
    saving: 'Saving...',
    noDepartment: 'No Department',
    week: 'Week',
    month: 'Month',
    // Empty state messages
    noDataAvailable: 'No data',
    noPosition: 'No position',
    noPhone: 'No phone',
    noAddress: 'No address',
    noSchedule: 'No schedule',
    noNotes: 'No notes',
    noAbilities: 'Abilities not set',
    notAssigned: 'Not assigned',
    dataNotEntered: 'Not entered',
    roleNotAssigned: 'Role not assigned',
    showMore: 'Show More',
    showLess: 'Show Less'
  },
  
  navigation: {
    dashboard: 'Dashboard',
    scheduleCalendar: 'Schedule Calendar',
    schedules: 'Schedules',
    autoGenerate: 'Auto Generate',
    employees: 'Employees',
    team: 'Team',
    leaveRequests: 'Leave Requests',
    leave: 'Leave',
    reports: 'Reports',
    settings: 'Settings',
    profile: 'My Profile',
    logout: 'Logout',
    help: 'Help',
    feedback: 'Feedback',
    mainMenu: 'Main Menu',
    quickActions: 'Quick Actions'
  },

  auth: {
    // Login
    login: 'Login',
    signin: 'Sign In',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    email: 'Email Address',
    password: 'Password',
    enterEmail: 'Enter your email',
    enterPassword: 'Enter your password',
    loginFailed: 'Login failed',
    signInToAccount: 'Sign in to your account',
    dontHaveAccount: "Don't have an account?",
    registerHere: 'Register here',
    
    // Login Errors
    emailRequired: 'Please enter your email',
    passwordRequired: 'Please enter your password',
    invalidEmailFormat: 'Invalid email format',
    userNotFound: 'Email not registered',
    invalidPassword: 'Incorrect password',
    networkError: 'Network error. Please check your internet connection.',

    // Register
    register: 'Register',
    createAccount: 'Create Account',
    creatingAccount: 'Creating Account...',
    joinSystem: 'Join our schedule management system',
    fullName: 'Full Name',
    enterFullName: 'Enter your full name',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm your password',
    passwordMinChars: 'Enter your password (min. 6 characters)',
    passwordsDoNotMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters long',
    registrationSuccessful: 'Registration successful! Please log in.',
    registrationFailed: 'Registration failed',
    alreadyHaveAccount: 'Already have an account?',
    signInHere: 'Sign in here',

    // Roles
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee'
  },

  header: {
    appTitle: 'Schedule Manager',
    dashboard: 'Dashboard',
    searchPlaceholder: 'Search schedules, employees...',
    notifications: 'Notifications',
    quickAdd: 'Quick add',
    userMenu: 'User menu',
    myProfile: 'My Profile',
    settings: 'Settings',
    helpSupport: 'Help & Support',
    logout: 'Logout',
    openSidebar: 'Open sidebar',
    closeSidebar: 'Close sidebar'
  },

  sidebar: {
    scheduleManager: 'Schedule Manager',
    dashboard: 'Dashboard',
    scheduleCalendar: 'Schedule Calendar',
    autoGenerate: 'Auto Generate',
    employees: 'Employees',
    leaveRequests: 'Leave Requests',
    reports: 'Reports',
    settings: 'Settings',
    mainMenu: 'Main Menu',
    quickActions: 'Quick Actions',
    newSchedule: 'New Schedule',
    addEmployee: 'Add Employee',
    requestLeave: 'Request Leave',
    thisWeek: 'This Week',
    help: 'Help',
    feedback: 'Feedback'
  },

  dashboard: {
    welcomeBack: 'Welcome back',
    scheduleOverview: "Here's your schedule overview",
    loadingDashboard: 'Loading dashboard...',
    failedToLoad: 'Failed to load dashboard data',
    totalEmployees: 'Total Employees',
    schedulesThisWeek: 'Schedules This Week',
    pendingLeaveRequests: 'Pending Leave Requests',
    upcomingShifts: 'Upcoming Shifts',
    recentSchedules: 'Recent Schedules',
    viewAll: 'View All',
    noRecentSchedules: 'No recent schedules found',
    scheduled: 'Scheduled',
    quickActions: 'Quick Actions',
    createSchedule: 'Create Schedule',
    addEmployee: 'Add Employee',
    autoGenerate: 'Auto Generate',
    viewReports: 'View Reports',
    // Alert Center
    alerts: 'Alert Center',
    noAlerts: 'No current alerts',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    // Notice Board
    notices: 'Notice Board',
    noNotices: 'No new notices',
    unreadNotices: 'Unread notices',
    markAsRead: 'Mark as read',
    newNotice: 'New notice',
    announcements: 'Announcements',
    // Team Rank Distribution
    teamRankDistribution: 'Team Rank Distribution'
  },

  employee: {
    employeeManagement: 'Employee Management',
    addEmployee: 'Add Employee',
    addNewEmployee: 'Add New Employee',
    editEmployee: 'Edit Employee',
    backToEmployees: 'Back to Employees',
    searchEmployees: 'Search employees...',
    allRoles: 'All Roles',
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
    loadingEmployees: 'Loading employees...',
    loadingEmployeeData: 'Loading employee data...',
    failedToLoadEmployees: 'Failed to load employees',
    noEmployeesFound: 'No employees found',
    tryAdjustingSearch: 'Try adjusting your search criteria',
    getStartedByAdding: 'Get started by adding your first employee',
    joined: 'Joined',
    active: 'Active',
    edit: 'Edit',
    delete: 'Delete',
    showing: 'Showing',
    of: 'of',
    employees: 'employees',
    totalOf: 'Total of',
    confirmDelete: 'Confirm Delete',
    deleteConfirmMessage: 'Are you sure you want to delete? This action cannot be undone.',
    deleteEmployee: 'Delete',
    failedToDeleteEmployee: 'Failed to delete employee',
    basicInformation: 'Basic Information',
    fullName: 'Full Name',
    enterFullName: 'Enter full name',
    emailAddress: 'Email Address',
    enterEmailAddress: 'Enter email address',
    role: 'Role',
    department: 'Department',
    enterDepartment: 'Enter department',
    position: 'Position',
    enterPosition: 'Enter position',
    phone: 'Phone',
    enterPhone: 'Enter phone number',
    address: 'Address',
    enterAddress: 'Enter address',
    birthDate: 'Birth Date',
    hireDate: 'Hire Date',
    password: 'Password',
    enterPassword: 'Enter password',
    toggleView: 'Toggle View',
    allDepartments: 'All Departments',
    noDepartment: 'No Department',
    call: 'Call',
    sendEmail: 'Send Email',
    security: 'Security',
    passwordHint: 'Leave empty to keep existing password',
    enterNewPasswordOptional: 'Enter new password to change',
    enterPasswordMinChars: 'Enter password (min. 6 characters)',
    contactInformation: 'Contact Information',
    phoneNumber: 'Phone Number',
    enterPhoneNumber: 'Enter phone number',
    employmentDetails: 'Employment Details',
    updating: 'Updating...',
    creating: 'Creating...',
    updateEmployee: 'Update Employee',
    createEmployee: 'Create Employee',
    nameRequired: 'Name is required',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required for new employees',
    passwordMinLength: 'Password must be at least 6 characters',
    failedToLoadEmployee: 'Failed to load employee',
    updateSuccess: 'Employee updated successfully!',
    createSuccess: 'Employee created successfully!',
    updateFailed: 'Failed to update employee',
    createFailed: 'Failed to create employee',
    // Employee Detail Modal
    employeeDetails: 'Employee Details',
    overview: 'Overview',
    schedule: 'Schedule',
    abilities: 'Abilities',
    notes: 'Notes',
    totalScore: 'Total Score',
    generalNote: 'General',
    praiseNote: 'Praise',
    cautionNote: 'Caution',
    addNote: 'Add Note',
    addNoteContent: 'Enter note content...',
    privateNote: 'Private note',
    private: 'Private',
    noNotesFound: 'No notes found',
    by: 'by',
    noSchedulesFound: 'No schedules found for this period',
    viewDetails: 'View Details',
    noNotesMessage: 'No notes have been written',
    noSchedulesMessage: 'No scheduled events'
  },

  schedule: {
    schedule: 'Schedule',
    schedules: 'Schedules',
    calendar: 'Calendar',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    monthly: 'Monthly',
    weekly: 'Weekly',
    daily: 'Daily',
    today: 'Today',
    shift: 'Shift',
    shiftType: 'Shift Type',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    startTime: 'Start Time',
    endTime: 'End Time',
    time: 'Time',
    assignedTo: 'Assigned To',
    createSchedule: 'Create Schedule',
    editSchedule: 'Edit Schedule',
    deleteSchedule: 'Delete Schedule',
    autoGenerate: 'Auto Generate',
    autoGenerateTitle: 'Auto Generate Schedule',
    autoGenerateDescription: 'Automatically create optimized schedules based on your preferences',
    generateSchedule: 'Generate Schedule',
    scheduleGenerated: 'Schedule generated successfully',
    schedulePeriod: 'Schedule Period',
    startDate: 'Start Date',
    endDate: 'End Date',
    selectEmployees: 'Select Employees',
    selectAll: 'Select All',
    selectNone: 'Select None',
    shiftConfiguration: 'Shift Configuration',
    morningShift: 'Morning Shift',
    afternoonShift: 'Afternoon Shift',
    nightShift: 'Night Shift',
    requiredStaff: 'Required Staff',
    schedulingConstraints: 'Scheduling Constraints',
    maxConsecutiveDays: 'Max Consecutive Days',
    minRestHours: 'Minimum Rest Hours',
    preferWeekendsOff: 'Prefer weekends off',
    fairDistribution: 'Fair shift distribution',
    generating: 'Generating...',
    generatedSchedulePreview: 'Generated Schedule Preview',
    approveAndSave: 'Approve & Save',
    regenerate: 'Regenerate',
    useTemplate: 'Use Template',
    selectTemplate: 'Select Template (Optional)',
    customConfiguration: 'Custom Configuration',
    failedToLoad: 'Failed to load schedules',
    failedToUpdate: 'Failed to update schedule',
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    failedToLoadData: 'Failed to load data',
    selectBothDates: 'Please select both start and end dates',
    endDateAfterStart: 'End date must be after start date',
    selectAtLeastOneEmployee: 'Please select at least one employee',
    enableAtLeastOneShift: 'Please enable at least one shift',
    failedToGenerate: 'Failed to generate schedule',
    addSchedule: 'Add Schedule',
    employee: 'Employee',
    selectEmployee: 'Select Employee',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    repeatSchedule: 'Repeat Schedule',
    repeatType: 'Repeat Type',
    repeatDays: 'Repeat Days',
    repeatUntil: 'Repeat Until',
    selectRepeatDays: 'Select days to repeat',
    notes: 'Notes',
    notesPlaceholder: 'Enter notes...',
    failedToSave: 'Failed to save',
    scheduleDetails: 'Schedule Details',
    more: 'More',
    loadingSchedule: 'Loading schedule...'
  },

  leave: {
    leaveRequest: 'Leave Request',
    leaveRequests: 'Leave Requests',
    requestLeave: 'Request Leave',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    reason: 'Reason',
    status: 'Status',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    submitRequest: 'Submit Request',
    annualLeave: 'Annual Leave',
    sickLeave: 'Sick Leave',
    personalLeave: 'Personal Leave',
    maternityLeave: 'Maternity Leave',
    paternityLeave: 'Paternity Leave'
  },

  form: {
    required: 'Required',
    optional: 'Optional',
    pleaseSelect: 'Please select',
    enterValue: 'Enter value',
    invalidEmail: 'Invalid email address',
    fieldRequired: 'This field is required',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    reset: 'Reset',
    clear: 'Clear'
  },

  pages: {
    profilePage: 'Profile Page',
    settingsPage: 'Settings Page',
    reportsPage: 'Reports Page',
    employeeAbilities: 'Employee Abilities',
    helpSupport: 'Help & Support',
    comingSoon: 'Coming soon...',
    pageNotFound: 'Page Not Found',
    pageNotFoundDescription: "The page you're looking for doesn't exist.",
    goBack: 'Go Back',
    notFound: '404'
  },

  messages: {
    success: 'Operation completed successfully',
    error: 'An error occurred',
    warning: 'Warning',
    info: 'Information',
    confirmAction: 'Do you want to continue with this action?',
    actionCancelled: 'Action cancelled',
    actionCompleted: 'Action completed',
    savingChanges: 'Saving changes...',
    changesSaved: 'Changes saved successfully',
    changesDiscarded: 'Changes discarded'
  },

  language: {
    korean: '한국어',
    english: 'English',
    selectLanguage: 'Select Language',
    languageChanged: 'Language changed successfully'
  },

  skills: {
    skills: 'Skills',
    skill: 'Skill',
    level: 'Level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert'
  },

  preferences: {
    preferences: 'Preferences',
    preference: 'Preference',
    shiftPreference: 'Shift Preference',
    workingHours: 'Working Hours',
    availability: 'Availability'
  },

  fab: {
    addSchedule: 'Add Schedule',
    addEmployee: 'Add Employee',
    requestLeave: 'Request Leave',
    viewReports: 'View Reports'
  },

  menu: {
    dashboard: 'Dashboard',
    employeeManagement: 'Employee Management',
    scheduleManagement: 'Schedule Management',
    autoSchedule: 'Auto Schedule',
    leaveManagement: 'Leave Management',
    reports: 'Reports',
    companySettings: 'Company Settings',
    noticeManagement: 'Notice Management',
    myProfile: 'My Profile',
    help: 'Help',
    logout: 'Logout',
    language: 'Language',
    addEmployee: 'Add Employee'
  },

  roles: {
    admin: 'Administrator',
    manager: 'Manager',
    employee: 'Employee'
  },

  notifications: {
    notifications: 'Notifications',
    notification: 'Notification',
    markAsRead: 'Mark as read',
    markAllAsRead: 'Mark all as read',
    noNotifications: 'No new notifications',
    newSchedule: 'New schedule assigned',
    leaveApproved: 'Leave request approved',
    leaveRejected: 'Leave request rejected',
    scheduleChanged: 'Schedule has been changed'
  },

  time: {
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    am: 'AM',
    pm: 'PM',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    thisMonth: 'This Month',
    nextMonth: 'Next Month'
  },

  alerts: {
    critical: 'Critical Alert',
    warning: 'Warning Alert',
    info: 'Information Alert',
    system: 'System Alert',
    maintenance: 'System Maintenance',
    staffShortage: 'Staff Shortage',
    scheduleConflict: 'Schedule Conflict',
    leaveConflict: 'Leave Conflict',
    overtime: 'Overtime',
    noAlerts: 'No current alerts'
  },

  notices: {
    general: 'General Notice',
    important: 'Important Notice',
    policy: 'Policy Change',
    event: 'Event',
    training: 'Training',
    holiday: 'Holiday',
    meeting: 'Meeting',
    announcement: 'Announcement',
    noNotices: 'No new notices',
    readAll: 'Read all',
    unreadCount: 'Unread'
  },

  scheduleManagement: {
    title: 'Schedule Draft Management',
    
    draftList: {
      title: 'Draft List',
      totalDrafts: 'Total {count} drafts',
      selectedDrafts: '{count}/{max} selected',
      selectionHint: 'You can select up to {max} drafts for comparison'
    },

    card: {
      createdAt: 'Created',
      period: 'Period',
      employees: 'Employees',
      score: 'Score',
      totalShifts: 'Total Shifts',
      coverage: 'Coverage',
      generationSettings: 'Generation Settings',
      conflicts: 'Conflicts',
      moreConflicts: 'more conflicts'
    },

    status: {
      active: 'Active',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      draft: 'Draft',
      currentlyActive: 'Currently Active'
    },

    actions: {
      compare: 'Compare',
      stopComparing: 'Stop Comparing',
      activate: 'Activate',
      delete: 'Delete',
      duplicate: 'Duplicate',
      export: 'Export',
      merge: 'Merge'
    },

    emptyState: {
      title: 'No drafts available',
      description: 'Create a new schedule draft to get started'
    },

    activeDraft: {
      title: 'Current Active Schedule',
      description: '{name} has been active since {date}'
    },

    comparison: {
      title: 'Schedule Comparison',
      summary: 'Comparison Summary',
      metric: 'Metric',
      difference: 'Difference',
      noChange: 'No change',
      conflicts: 'Conflicts',
      affectedEmployees: 'Affected employees',
      
      tabs: {
        overview: 'Overview',
        metrics: 'Metrics',
        schedule: 'Schedule',
        conflicts: 'Conflicts'
      },

      loadError: 'Failed to load comparison data'
    },
    
    merge: {
      title: 'Merge Schedule Drafts',
      
      steps: {
        options: 'Options',
        preview: 'Preview'
      },
      
      options: {
        title: 'Merge Options',
        name: 'Merged Draft Name',
        description: 'Description',
        conflictResolution: 'Conflict Resolution Strategy',
        priorityOrder: 'Priority Order',
        mergeStrategy: 'Merge Strategy',
        preserveMetadata: 'Preserve Metadata'
      },
      
      resolution: {
        priority: 'Priority Based',
        latest: 'Latest Version',
        combine: 'Combine Non-Conflicting'
      },
      
      strategy: {
        combine: 'Combine All',
        overwrite: 'Overwrite',
        selective: 'Selective Merge'
      },
      
      preview: {
        title: 'Merge Preview',
        totalDrafts: 'Total Drafts',
        totalItems: 'Total Items',
        totalConflicts: 'Total Conflicts',
        draftDetails: 'Draft Details',
        conflicts: 'Conflicts',
        timeOverlap: 'Time Overlap',
        noData: 'No preview data available'
      },
      
      actions: {
        preview: 'Preview',
        merge: 'Merge',
        merging: 'Merging...'
      },
      
      errors: {
        previewFailed: 'Failed to load merge preview',
        mergeFailed: 'Failed to merge drafts'
      }
    },

    activation: {
      title: 'Activate Schedule',
      summary: 'Activation Summary',
      draftName: 'Draft Name',
      period: 'Period',
      employees: 'Employees',
      totalShifts: 'Total Shifts',
      currentSchedule: 'Current Schedule',
      currentScheduleDescription: '{name} has been active since {activatedDate}',
      impactAnalysis: 'Impact Analysis',
      confirmation: 'Confirmation',
      confirmationInstructions: 'Type "{draftName}" to continue',
      typeDraftName: 'Type draft name',
      confirmActivation: 'Confirm Activation',
      activating: 'Activating...',
      blockingWarning: 'Cannot activate due to errors. Please resolve issues first.',

      warnings: {
        replaceActive: 'Current active schedule will be replaced',
        hasConflicts: 'There are {count} conflicts',
        lowScore: 'Low score ({score}%)',
        lowCoverage: 'Low coverage ({coverage}%)'
      },

      showAdvancedOptions: 'Show Advanced Options',
      hideAdvancedOptions: 'Hide Advanced Options',

      options: {
        notifyEmployees: 'Notify employees',
        notifyEmployeesDesc: 'Send email notifications to employees about schedule changes',
        sendScheduleUpdates: 'Send schedule updates',
        sendScheduleUpdatesDesc: 'Send the new schedule to employees',
        archiveCurrentSchedule: 'Archive current schedule',
        archiveCurrentScheduleDesc: 'Archive the currently active schedule',
        backupCurrentSchedule: 'Backup current schedule',
        backupCurrentScheduleDesc: 'Create a backup of the current schedule'
      }
    },

    errors: {
      loadFailed: 'Failed to load drafts',
      activationFailed: 'Failed to activate schedule',
      deleteFailed: 'Failed to delete draft'
    },

    confirmDelete: 'Are you sure you want to delete this draft? This action cannot be undone.'
  }
};

export default en;