import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEmployees, deleteEmployee, getEmployeeAbility } from '../../services/api';
import { formatDate as formatDateUtil } from '../../utils/dateFormatter';
import EmployeeDetailModal from './EmployeeDetailModal';
import RankBadge from '../shared/RankBadge';
import BottomSheet, { BottomSheetAction } from '../shared/BottomSheet';
import PullToRefresh from '../shared/PullToRefresh';
import TouchRipple from '../shared/TouchRipple';
import './EmployeeList.css';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // Only list view
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [employeeAbilities, setEmployeeAbilities] = useState({});
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const initialFetchRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Debounce search term
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Initial data fetch
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchEmployees();
    }
    
    // Cleanup function to abort requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchEmployees = useCallback(async () => {
    // Prevent duplicate calls with multiple safeguards
    if (fetchInProgressRef.current) return;
    
    try {
      // Set fetch in progress flag
      fetchInProgressRef.current = true;
      
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError('');
      
      const response = await getEmployees();
      
      // API returns { employees: [...] }
      const employeeData = response.data?.employees || response.data || [];
      const validEmployeeData = Array.isArray(employeeData) ? employeeData : [];
      
      setEmployees(validEmployeeData);
      
      // Fetch abilities for employees we don't have data for
      if (validEmployeeData.length > 0) {
        await fetchEmployeeAbilities(validEmployeeData);
      }
    } catch (err) {
      // Don't show error if request was aborted
      if (err.name !== 'AbortError') {
        console.error('Employee fetch error:', err);
        console.error('Error details:', err.response?.data || err.message);
        
        // Handle authentication errors
        if (err.response?.status === 401) {
          setError('Authentication required. Please log in.');
        } else {
          setError('Failed to load employees');
        }
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
      abortControllerRef.current = null;
    }
  }, []); // Remove dependencies to prevent unnecessary recreation

  const fetchEmployeeAbilities = useCallback(async (employees) => {
    // Prevent duplicate ability fetches using loading state and employee count check
    if (abilitiesLoading || employees.length === 0) return;
    
    try {
      setAbilitiesLoading(true);
      const abilitiesMap = {};
      
      // Use functional state update to get current abilities and avoid stale closure
      const currentAbilities = await new Promise(resolve => {
        setEmployeeAbilities(current => {
          resolve(current);
          return current;
        });
      });
      
      // Only fetch abilities for employees we don't have data for
      const employeesToFetch = employees.filter(emp => 
        !currentAbilities.hasOwnProperty(emp.id)
      );
      
      if (employeesToFetch.length === 0) {
        setAbilitiesLoading(false);
        return;
      }
      
      // Fetch abilities for each employee with error handling
      const abilityPromises = employeesToFetch.map(async (employee) => {
        try {
          const response = await getEmployeeAbility(employee.id);
          abilitiesMap[employee.id] = response.data;
        } catch (err) {
          console.warn(`Failed to fetch abilities for employee ${employee.id}:`, err);
          abilitiesMap[employee.id] = null;
        }
      });
      
      await Promise.all(abilityPromises);
      
      // Merge with existing abilities
      setEmployeeAbilities(prev => ({ ...prev, ...abilitiesMap }));
    } catch (err) {
      console.error('Error fetching employee abilities:', err);
    } finally {
      setAbilitiesLoading(false);
    }
  }, []); // Remove dependencies to prevent unnecessary recreation

  // Force refresh function that clears cache
  const forceRefresh = useCallback(async () => {
    // Clear abilities cache to force refetch
    setEmployeeAbilities({});
    await fetchEmployees();
  }, [fetchEmployees]);

  const handleEmployeePress = useCallback((employee) => {
    setSelectedEmployee(employee);
    setShowActionSheet(true);
  }, []);

  const handleEmployeeLongPress = useCallback((employee) => {
    // Immediate action sheet on long press
    setSelectedEmployee(employee);
    setShowActionSheet(true);
  }, []);

  const handleViewDetails = useCallback((employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
    setShowActionSheet(false);
  }, []);

  const handleScheduleClick = useCallback((employee) => {
    navigate(`/schedules?employeeId=${employee.id}&employeeName=${employee.name}`);
    setShowActionSheet(false);
  }, [navigate]);

  const handleAbilitiesClick = useCallback((employee) => {
    navigate(`/employees/${employee.id}/abilities`);
    setShowActionSheet(false);
  }, [navigate]);

  const handleDeleteClick = useCallback((employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
    setShowActionSheet(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!employeeToDelete) return;
    
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees((Array.isArray(employees) ? employees : []).filter(emp => emp.id !== employeeToDelete.id));
      // Remove abilities for deleted employee
      setEmployeeAbilities(prev => {
        const updated = { ...prev };
        delete updated[employeeToDelete.id];
        return updated;
      });
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (err) {
      setError(t('employee.failedToDeleteEmployee'));
      console.error('Employee delete error:', err);
    }
  }, [employeeToDelete, employees, t]);

  const handleEditClick = useCallback((employee) => {
    navigate(`/employees/${employee.id}/edit`);
    setShowActionSheet(false);
  }, [navigate]);

  const handleCallClick = useCallback((phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
    setShowActionSheet(false);
  }, []);

  const handleEmailClick = useCallback((email) => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
    setShowActionSheet(false);
  }, []);

  const getEmployeeRank = useCallback((employeeId) => {
    const ability = employeeAbilities[employeeId];
    if (!ability) return null;
    
    // Calculate overall rank based on abilities
    const abilities = ability.abilities || [];
    if (abilities.length === 0) return 'D';
    
    const averageRank = abilities.reduce((sum, skill) => {
      const rankValue = {'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1}[skill.rank] || 1;
      return sum + rankValue;
    }, 0) / abilities.length;
    
    if (averageRank >= 4.5) return 'S';
    if (averageRank >= 3.5) return 'A';
    if (averageRank >= 2.5) return 'B';
    if (averageRank >= 1.5) return 'C';
    return 'D';
  }, [employeeAbilities]);

  // Get unique departments from employees (memoized)
  const departments = useMemo(() => 
    [...new Set(employees.map(emp => emp.department))].filter(Boolean),
    [employees]
  );

  // Helper function to highlight search term
  const highlightText = useCallback((text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? 
        <mark key={i} style={{ background: '#fef3c7', color: 'inherit', fontWeight: 600 }}>{part}</mark> : 
        part
    );
  }, []);

  // Filter employees based on debounced search term and filters (memoized)
  const filteredEmployees = useMemo(() => 
    (Array.isArray(employees) ? employees : []).filter(employee => {
      const matchesSearch = 
        employee.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const employeeRole = employee.user?.role || employee.role;
      const matchesRole = filterRole === 'all' || employeeRole === filterRole;
      const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
      
      return matchesSearch && matchesRole && matchesDepartment;
    }),
    [employees, debouncedSearchTerm, filterRole, filterDepartment]
  );

  const getRoleColor = useCallback((role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'role-admin';
      case 'manager': return 'role-manager';
      case 'employee': return 'role-employee';
      default: return 'role-default';
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return t('common.dataNotEntered');
    return formatDateUtil(dateString, language, { format: 'short', showWeekday: false });
  }, [t, language]);

  // Group employees by department (memoized)
  const groupedEmployees = useMemo(() => 
    filteredEmployees.reduce((groups, employee) => {
      const dept = employee.department || t('employee.noDepartment');
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(employee);
      return groups;
    }, {}),
    [filteredEmployees, t]
  );

  if (loading) {
    return (
      <div className="employee-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">{t('employee.loadingEmployees')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-list-container">
      {/* Minimalist Header */}
      <div className="employee-page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1 className="page-main-title">{t('employee.employeeManagement')}</h1>
          </div>
          
          <div className="search-section">
            <div className="search-container">
              <i className="fas fa-search search-icon-left"></i>
              <input
                ref={searchInputRef}
                type="text"
                className="search-box"
                placeholder="이름, 부서, 역할로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchTerm('');
                    searchInputRef.current?.focus();
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="controls-wrapper">
          <div className="filters-group">
            <button className="filter-btn">
              <i className="fas fa-filter"></i>
              <span>필터</span>
            </button>
            <button className="sort-btn">
              <i className="fas fa-sort"></i>
              <span>정렬</span>
            </button>
            <select 
              className="filter-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">모든 역할</option>
              <option value="admin">관리자</option>
              <option value="manager">매니저</option>
              <option value="employee">직원</option>
            </select>
            
            {departments.length > 0 && (
              <select 
                className="filter-select"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">모든 부서</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="view-controls">
            <button
              className="add-employee-btn"
              onClick={() => navigate('/employees/new')}
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Employee Content */}
      <div className="employee-content-area">
        {error && (
          <div className="error-toast">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button onClick={() => setError('')}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {filteredEmployees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3 className="empty-title">{t('employee.noEmployeesFound')}</h3>
            <p className="empty-message">
              {searchTerm || filterRole !== 'all' || filterDepartment !== 'all' 
                ? t('employee.tryAdjustingSearch') 
                : t('employee.getStartedByAdding')}
            </p>
            <button
              className="empty-action"
              onClick={() => navigate('/employees/new')}
            >
              <i className="fas fa-plus"></i>
              <span>{t('employee.addEmployee')}</span>
            </button>
          </div>
        ) : (
          // Table View Only
          <div className="employee-table-view">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>직원</th>
                  <th>부서</th>
                  <th>역할</th>
                  <th>랭크</th>
                  <th>입사일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} onClick={() => handleEmployeePress(employee)}>
                    <td>
                      <div className="table-employee-info">
                        <div className="table-avatar">
                          {employee.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="table-name-role">
                          <span className="table-name">{employee.name}</span>
                          <span className="table-role">{employee.position || '직책 없음'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{employee.department || '부서 없음'}</td>
                    <td>
                      <span className={`role-badge role-${(employee.user?.role || employee.role || 'employee').toLowerCase()}`}>
                        {(employee.user?.role || employee.role || 'employee').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {getEmployeeRank(employee.id) && (
                        <span className={`rank-display rank-${getEmployeeRank(employee.id).toLowerCase()}`}>
                          {getEmployeeRank(employee.id)}
                        </span>
                      )}
                    </td>
                    <td>{formatDate(employee.hireDate)}</td>
                    <td>
                      <button
                        className="quick-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmployeePress(employee);
                        }}
                      >
                        <i className="fas fa-ellipsis-h"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Sheet Action Menu */}
      <BottomSheet 
        isOpen={showActionSheet} 
        onClose={() => setShowActionSheet(false)}
        enableSwipeToClose={true}
        backdropBlur={true}
      >
        {selectedEmployee && (
          <>
            {/* Employee Info Header */}
            <div className="bottom-sheet-info">
              <div className="bottom-sheet-avatar">
                {selectedEmployee.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="bottom-sheet-info-text">
                <h4>{selectedEmployee.name}</h4>
                <p>{selectedEmployee.position || t('common.noPosition')} · {selectedEmployee.department || t('common.noDepartment')}</p>
              </div>
            </div>

            {/* Main Actions */}
            <div className="bottom-sheet-group">
              <BottomSheetAction
                icon="fas fa-eye"
                label="상세 정보 보기"
                onClick={() => handleViewDetails(selectedEmployee)}
              />
              <BottomSheetAction
                icon="fas fa-calendar"
                label="스케줄 보기"
                onClick={() => handleScheduleClick(selectedEmployee)}
              />
              <BottomSheetAction
                icon="fas fa-star"
                label="능력 관리"
                onClick={() => handleAbilitiesClick(selectedEmployee)}
              />
            </div>

            <div className="bottom-sheet-divider" />

            {/* Contact Actions */}
            <div className="bottom-sheet-group">
              {selectedEmployee.phone && (
                <BottomSheetAction
                  icon="fas fa-phone"
                  label="전화 걸기"
                  onClick={() => handleCallClick(selectedEmployee.phone)}
                />
              )}
              <BottomSheetAction
                icon="fas fa-envelope"
                label="이메일 보내기"
                onClick={() => handleEmailClick(selectedEmployee.email)}
              />
            </div>

            <div className="bottom-sheet-divider" />

            {/* Edit and Delete Actions */}
            <div className="bottom-sheet-group">
              <BottomSheetAction
                icon="fas fa-edit"
                label="정보 수정"
                onClick={() => handleEditClick(selectedEmployee)}
              />
              <BottomSheetAction
                icon="fas fa-trash"
                label="직원 삭제"
                onClick={() => handleDeleteClick(selectedEmployee)}
                danger={true}
              />
            </div>
          </>
        )}
      </BottomSheet>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div 
            className="modal-backdrop"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="modal-dialog">
            <div className="modal-icon-wrapper delete">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="modal-title">{t('employee.confirmDelete')}</h3>
            <p className="modal-message">
              <strong>{employeeToDelete?.name}</strong>님을 정말 삭제하시겠습니까?
            </p>
            <p className="modal-warning">
              {t('employee.deleteConfirmMessage')}
            </p>
            <div className="modal-actions">
              <TouchRipple
                className="modal-btn cancel"
                onClick={() => setShowDeleteModal(false)}
                color="rgba(142, 142, 147, 0.2)"
              >
                {t('common.cancel')}
              </TouchRipple>
              <TouchRipple
                className="modal-btn confirm delete"
                onClick={handleDeleteConfirm}
                color="rgba(255, 59, 48, 0.2)"
              >
                {t('employee.deleteEmployee')}
              </TouchRipple>
            </div>
          </div>
        </>
      )}

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <EmployeeDetailModal
          employeeId={selectedEmployee.id}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
};

export default EmployeeList;