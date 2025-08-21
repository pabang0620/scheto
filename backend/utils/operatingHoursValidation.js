/**
 * Validation utilities for operating hours and staffing
 */

// Time format validation
const isValidTimeFormat = (timeString) => {
  if (!timeString) return true; // Allow null/undefined for optional times
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

// Validate time range (start time should be before end time)
const validateTimeRange = (startTime, endTime, allowOvernight = true) => {
  if (!startTime || !endTime) return { valid: true };
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (allowOvernight) {
    // Overnight shifts are allowed
    return { valid: true };
  } else {
    // End time must be after start time on the same day
    if (endMinutes <= startMinutes) {
      return {
        valid: false,
        error: 'End time must be after start time'
      };
    }
  }
  
  return { valid: true };
};

// Convert time string to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes since midnight to time string
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Validate daily operating hours
const validateDailyHours = (dailyHours) => {
  const errors = [];
  
  if (!Array.isArray(dailyHours)) {
    return { valid: false, errors: ['Daily hours must be an array'] };
  }
  
  // Check for duplicate days of week
  const dayOfWeekSet = new Set();
  
  dailyHours.forEach((day, index) => {
    const prefix = `Day ${index + 1}`;
    
    // Validate day of week
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      errors.push(`${prefix}: Day of week must be between 0 (Sunday) and 6 (Saturday)`);
    }
    
    if (dayOfWeekSet.has(day.dayOfWeek)) {
      errors.push(`${prefix}: Duplicate day of week ${day.dayOfWeek}`);
    } else {
      dayOfWeekSet.add(day.dayOfWeek);
    }
    
    // Validate times if the day is open
    if (day.isOpen !== false) {
      if (!isValidTimeFormat(day.openTime)) {
        errors.push(`${prefix}: Invalid open time format`);
      }
      
      if (!isValidTimeFormat(day.closeTime)) {
        errors.push(`${prefix}: Invalid close time format`);
      }
      
      // Validate time range
      if (day.openTime && day.closeTime) {
        const timeValidation = validateTimeRange(day.openTime, day.closeTime);
        if (!timeValidation.valid) {
          errors.push(`${prefix}: ${timeValidation.error}`);
        }
      }
      
      // Validate break times
      if (day.breakStart && !isValidTimeFormat(day.breakStart)) {
        errors.push(`${prefix}: Invalid break start time format`);
      }
      
      if (day.breakEnd && !isValidTimeFormat(day.breakEnd)) {
        errors.push(`${prefix}: Invalid break end time format`);
      }
      
      if (day.breakStart && day.breakEnd) {
        const breakValidation = validateTimeRange(day.breakStart, day.breakEnd, false);
        if (!breakValidation.valid) {
          errors.push(`${prefix}: Break end time must be after break start time`);
        }
        
        // Ensure breaks are within operating hours
        const openMinutes = timeToMinutes(day.openTime || '00:00');
        const closeMinutes = timeToMinutes(day.closeTime || '23:59');
        const breakStartMinutes = timeToMinutes(day.breakStart);
        const breakEndMinutes = timeToMinutes(day.breakEnd);
        
        if (breakStartMinutes < openMinutes || breakEndMinutes > closeMinutes) {
          errors.push(`${prefix}: Break times must be within operating hours`);
        }
      }
    }
    
    // Validate staff numbers
    if (day.minStaff !== undefined && (day.minStaff < 0 || day.minStaff > 100)) {
      errors.push(`${prefix}: Minimum staff must be between 0 and 100`);
    }
    
    if (day.maxStaff !== undefined && (day.maxStaff < 1 || day.maxStaff > 100)) {
      errors.push(`${prefix}: Maximum staff must be between 1 and 100`);
    }
    
    if (day.minStaff && day.maxStaff && day.minStaff > day.maxStaff) {
      errors.push(`${prefix}: Minimum staff cannot be greater than maximum staff`);
    }
    
    // Validate time slots
    if (day.timeSlots && Array.isArray(day.timeSlots)) {
      const hourSlotSet = new Set();
      
      day.timeSlots.forEach((slot, slotIndex) => {
        const slotPrefix = `${prefix}, Time Slot ${slotIndex + 1}`;
        
        // Validate hour slot
        if (slot.hourSlot < 0 || slot.hourSlot > 23) {
          errors.push(`${slotPrefix}: Hour slot must be between 0 and 23`);
        }
        
        if (hourSlotSet.has(slot.hourSlot)) {
          errors.push(`${slotPrefix}: Duplicate hour slot ${slot.hourSlot}`);
        } else {
          hourSlotSet.add(slot.hourSlot);
        }
        
        // Validate staff numbers
        if (slot.requiredStaff < 0 || slot.requiredStaff > 50) {
          errors.push(`${slotPrefix}: Required staff must be between 0 and 50`);
        }
        
        if (slot.preferredStaff !== undefined && (slot.preferredStaff < slot.requiredStaff)) {
          errors.push(`${slotPrefix}: Preferred staff cannot be less than required staff`);
        }
        
        if (slot.maxStaff !== undefined && (slot.maxStaff < slot.requiredStaff)) {
          errors.push(`${slotPrefix}: Maximum staff cannot be less than required staff`);
        }
        
        // Validate priority
        if (slot.priority && !['low', 'normal', 'high', 'critical'].includes(slot.priority)) {
          errors.push(`${slotPrefix}: Priority must be low, normal, high, or critical`);
        }
        
        // Ensure time slot is within operating hours
        if (day.openTime && day.closeTime && day.isOpen !== false) {
          const openHour = parseInt(day.openTime.split(':')[0]);
          const closeHour = parseInt(day.closeTime.split(':')[0]);
          
          if (slot.hourSlot < openHour || slot.hourSlot >= closeHour) {
            errors.push(`${slotPrefix}: Hour slot ${slot.hourSlot} is outside operating hours (${openHour}-${closeHour})`);
          }
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate staffing rules
const validateStaffingRules = (staffingRules) => {
  const errors = [];
  
  if (!Array.isArray(staffingRules)) {
    return { valid: false, errors: ['Staffing rules must be an array'] };
  }
  
  staffingRules.forEach((rule, index) => {
    const prefix = `Rule ${index + 1}`;
    
    // Validate rule name
    if (!rule.ruleName || rule.ruleName.trim().length === 0) {
      errors.push(`${prefix}: Rule name is required`);
    }
    
    // Validate rule type
    if (!['time_based', 'day_based', 'volume_based', 'seasonal'].includes(rule.ruleType)) {
      errors.push(`${prefix}: Rule type must be time_based, day_based, volume_based, or seasonal`);
    }
    
    // Validate priority
    if (rule.priority !== undefined && (rule.priority < 1 || rule.priority > 10)) {
      errors.push(`${prefix}: Priority must be between 1 and 10`);
    }
    
    // Validate date range
    if (rule.effectiveFrom && rule.effectiveTo) {
      const fromDate = new Date(rule.effectiveFrom);
      const toDate = new Date(rule.effectiveTo);
      
      if (fromDate >= toDate) {
        errors.push(`${prefix}: Effective from date must be before effective to date`);
      }
    }
    
    // Validate conditions (basic validation - can be expanded)
    if (!rule.conditions || typeof rule.conditions !== 'object') {
      errors.push(`${prefix}: Conditions must be a valid object`);
    }
    
    // Validate staffing requirements (basic validation - can be expanded)
    if (!rule.staffingRequirements || typeof rule.staffingRequirements !== 'object') {
      errors.push(`${prefix}: Staffing requirements must be a valid object`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate schedule override
const validateScheduleOverride = (override) => {
  const errors = [];
  
  // Validate override type
  if (!['closed', 'special_hours', 'special_staffing'].includes(override.overrideType)) {
    errors.push('Override type must be closed, special_hours, or special_staffing');
  }
  
  // Validate override date
  const overrideDate = new Date(override.overrideDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (overrideDate < today) {
    errors.push('Override date cannot be in the past');
  }
  
  // Validate custom hours if provided
  if (override.overrideType === 'special_hours' && override.customHours) {
    const customHours = override.customHours;
    
    if (customHours.openTime && !isValidTimeFormat(customHours.openTime)) {
      errors.push('Custom open time must be in valid format (HH:MM)');
    }
    
    if (customHours.closeTime && !isValidTimeFormat(customHours.closeTime)) {
      errors.push('Custom close time must be in valid format (HH:MM)');
    }
    
    if (customHours.openTime && customHours.closeTime) {
      const timeValidation = validateTimeRange(customHours.openTime, customHours.closeTime);
      if (!timeValidation.valid) {
        errors.push(`Custom hours: ${timeValidation.error}`);
      }
    }
  }
  
  // Validate staffing override if provided
  if (override.overrideType === 'special_staffing' && override.staffingOverride) {
    // Basic validation - can be expanded based on staffing override structure
    if (typeof override.staffingOverride !== 'object') {
      errors.push('Staffing override must be a valid object');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate template consistency (cross-field validation)
const validateTemplateConsistency = (template) => {
  const errors = [];
  const warnings = [];
  
  if (!template.dailyHours || template.dailyHours.length === 0) {
    errors.push('Template must have at least one day defined');
    return { valid: false, errors, warnings };
  }
  
  // Check if all days are closed
  const openDays = template.dailyHours.filter(day => day.isOpen !== false);
  if (openDays.length === 0) {
    warnings.push('All days are closed - template will not generate any schedules');
  }
  
  // Check for reasonable operating hours
  openDays.forEach(day => {
    if (day.openTime && day.closeTime) {
      const openMinutes = timeToMinutes(day.openTime);
      const closeMinutes = timeToMinutes(day.closeTime);
      const operatingMinutes = closeMinutes > openMinutes ? 
        closeMinutes - openMinutes : 
        (1440 - openMinutes) + closeMinutes; // Handle overnight
      
      if (operatingMinutes < 120) { // Less than 2 hours
        warnings.push(`Day ${day.dayOfWeek}: Very short operating hours (less than 2 hours)`);
      } else if (operatingMinutes > 720) { // More than 12 hours
        warnings.push(`Day ${day.dayOfWeek}: Very long operating hours (more than 12 hours)`);
      }
    }
  });
  
  // Check staffing levels consistency
  let hasTimeSlots = false;
  let hasBasicStaffing = false;
  
  template.dailyHours.forEach(day => {
    if (day.timeSlots && day.timeSlots.length > 0) {
      hasTimeSlots = true;
    }
    if (day.minStaff || day.maxStaff) {
      hasBasicStaffing = true;
    }
  });
  
  if (hasTimeSlots && hasBasicStaffing) {
    warnings.push('Template uses both time slots and basic staffing - time slots will take precedence');
  }
  
  // Check for weekend-only operations
  const weekendDays = template.dailyHours.filter(day => 
    (day.dayOfWeek === 0 || day.dayOfWeek === 6) && day.isOpen !== false
  );
  const weekdayDays = template.dailyHours.filter(day => 
    day.dayOfWeek > 0 && day.dayOfWeek < 6 && day.isOpen !== false
  );
  
  if (weekendDays.length > 0 && weekdayDays.length === 0) {
    warnings.push('Template only operates on weekends');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// Calculate total weekly operating hours
const calculateWeeklyHours = (dailyHours) => {
  let totalHours = 0;
  
  dailyHours.forEach(day => {
    if (day.isOpen !== false && day.openTime && day.closeTime) {
      const openMinutes = timeToMinutes(day.openTime);
      const closeMinutes = timeToMinutes(day.closeTime);
      const operatingMinutes = closeMinutes > openMinutes ? 
        closeMinutes - openMinutes : 
        (1440 - openMinutes) + closeMinutes; // Handle overnight
      
      totalHours += operatingMinutes / 60;
    }
  });
  
  return totalHours;
};

// Generate template summary
const generateTemplateSummary = (template) => {
  const openDays = template.dailyHours.filter(day => day.isOpen !== false);
  const totalWeeklyHours = calculateWeeklyHours(template.dailyHours);
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const openDayNames = openDays.map(day => dayNames[day.dayOfWeek]).sort();
  
  let totalStaffRequirement = 0;
  let hasTimeSlots = false;
  
  template.dailyHours.forEach(day => {
    if (day.timeSlots && day.timeSlots.length > 0) {
      hasTimeSlots = true;
      totalStaffRequirement += day.timeSlots.reduce((sum, slot) => sum + slot.requiredStaff, 0);
    } else if (day.minStaff) {
      totalStaffRequirement += day.minStaff;
    }
  });
  
  return {
    templateName: template.templateName,
    description: template.description,
    openDays: openDayNames.length,
    openDayNames,
    totalWeeklyHours: Math.round(totalWeeklyHours * 10) / 10,
    averageDailyHours: openDays.length > 0 ? Math.round((totalWeeklyHours / openDays.length) * 10) / 10 : 0,
    hasTimeSlots,
    totalStaffRequirement,
    averageStaffPerDay: openDays.length > 0 ? Math.round((totalStaffRequirement / openDays.length) * 10) / 10 : 0,
    timezone: template.timezone || 'UTC',
    isDefault: template.isDefault || false
  };
};

module.exports = {
  isValidTimeFormat,
  validateTimeRange,
  timeToMinutes,
  minutesToTime,
  validateDailyHours,
  validateStaffingRules,
  validateScheduleOverride,
  validateTemplateConsistency,
  calculateWeeklyHours,
  generateTemplateSummary
};