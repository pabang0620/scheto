import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getLeaveRequests, createLeaveRequest, updateLeaveRequest, deleteLeaveRequest, leaveRequests } from '../../services/api';
import { formatDate as formatDateUtil, calculateDaysDiff } from '../../utils/dateFormatter';
import './LeaveRequest.css';

const LeaveRequest = () => {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    type: 'vacation',
    reason: '',
    halfDay: false,
    halfDayPeriod: 'morning'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  const { user } = useContext(AuthContext);
  const { t, language } = useLanguage();

  const fetchLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      
      // 관리자/매니저는 모든 휴가 신청을 볼 수 있음
      if (user?.role === 'admin' || user?.role === 'manager') {
        // 모든 휴가 신청 가져오기
        response = await leaveRequests.getAll();
      } else {
        // 일반 직원은 본인 휴가만
        response = await leaveRequests.getMyRequests();
      }
      
      // API 응답 구조에 따라 처리
      const leaveData = response.data?.leaves || response.data || [];
      setRequests(Array.isArray(leaveData) ? leaveData : []);
    } catch (err) {
      setError('휴가 신청 내역을 불러오는데 실패했습니다');
      console.error('Leave requests fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]); // user.role이 변경될 때만 함수 재생성

  useEffect(() => {
    // user가 있을 때만 fetch
    if (user) {
      fetchLeaveRequests();
    }
  }, [fetchLeaveRequests, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates');
      return false;
    }
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('End date must be after or equal to start date');
      return false;
    }
    
    if (!formData.reason.trim()) {
      setError('Please provide a reason for your leave request');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const submitData = {
        ...formData,
        reason: formData.reason.trim()
      };
      
      if (editingRequest) {
        await updateLeaveRequest(editingRequest.id, submitData);
        setSuccess('Leave request updated successfully!');
        setRequests(prev => (Array.isArray(prev) ? prev : []).map(req => 
          req.id === editingRequest.id 
            ? { ...req, ...submitData, status: 'pending' }
            : req
        ));
      } else {
        const response = await createLeaveRequest(submitData);
        setSuccess('Leave request submitted successfully!');
        setRequests(prev => [response.data, ...(Array.isArray(prev) ? prev : [])]);
      }
      
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      startDate: new Date(request.startDate).toISOString().split('T')[0],
      endDate: new Date(request.endDate).toISOString().split('T')[0],
      type: request.type,
      reason: request.reason,
      halfDay: request.halfDay || false,
      halfDayPeriod: request.halfDayPeriod || 'morning'
    });
    setShowForm(true);
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('정말로 이 휴가 신청을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await deleteLeaveRequest(requestId);
      setRequests(prev => (Array.isArray(prev) ? prev : []).filter(req => req.id !== requestId));
      setSuccess('휴가 신청이 삭제되었습니다');
    } catch (err) {
      setError('휴가 신청 삭제에 실패했습니다');
    }
  };
  
  const handleApprove = async (requestId) => {
    if (!window.confirm('이 휴가 신청을 승인하시겠습니까?')) {
      return;
    }
    
    try {
      await leaveRequests.approve(requestId, '승인되었습니다');
      await fetchLeaveRequests();
      setSuccess('휴가 신청이 승인되었습니다');
    } catch (err) {
      setError('휴가 승인에 실패했습니다');
    }
  };
  
  const handleReject = async (requestId) => {
    const reason = window.prompt('거절 사유를 입력하세요:');
    if (!reason) return;
    
    try {
      await leaveRequests.reject(requestId, reason);
      await fetchLeaveRequests();
      setSuccess('휴가 신청이 거절되었습니다');
    } catch (err) {
      setError('휴가 거절에 실패했습니다');
    }
  };

  const resetForm = () => {
    setFormData({
      startDate: '',
      endDate: '',
      type: 'vacation',
      reason: '',
      halfDay: false,
      halfDayPeriod: 'morning'
    });
    setEditingRequest(null);
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      case 'emergency': return '🚨';
      default: return '📅';
    }
  };

  // 날짜 포맷 함수 (유틸리티 사용)
  const formatDate = (dateString, options = {}) => {
    return formatDateUtil(dateString, language, options);
  };

  // 날짜 차이 계산 (유틸리티 사용)
  const calculateDays = (startDate, endDate, halfDay) => {
    return calculateDaysDiff(startDate, endDate, halfDay);
  };

  const filteredRequests = (Array.isArray(requests) ? requests : []).filter(request => {
    if (filter === 'all') return true;
    return request.status?.toLowerCase() === filter;
  });

  if (loading) {
    return (
      <div className="leave-request-container">
        <div className="loading-spinner">
          <div className="spinner"><span></span></div>
          <p>휴가 신청 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leave-request-container">
      <div className="leave-header">
        <div className="header-content">
          <h1>휴가 신청</h1>
          <button 
            className="new-request-btn"
            onClick={() => setShowForm(true)}
          >
            + 새 휴가 신청
          </button>
        </div>
        
        <div className="filter-section">
          <label htmlFor="statusFilter">상태별 필터:</label>
          <select
            id="statusFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">전체</option>
            <option value="pending">대기중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Request Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content form-modal">
            <div className="modal-header">
              <h3>{editingRequest ? '휴가 신청 수정' : '새 휴가 신청'}</h3>
              <button
                className="modal-close"
                onClick={() => {
                  resetForm();
                  setError('');
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="type">휴가 유형</label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="vacation">연차</option>
                    <option value="sick">병가</option>
                    <option value="personal">개인 휴가</option>
                    <option value="emergency">긴급 휴가</option>
                  </select>
                </div>
                
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="halfDay"
                      checked={formData.halfDay}
                      onChange={handleInputChange}
                    />
                    <span className="checkmark"></span>
                    <span>반차</span>
                  </label>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="startDate">시작일</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endDate">종료일</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              {formData.halfDay && (
                <div className="form-group">
                  <label htmlFor="halfDayPeriod">반차 시간대</label>
                  <select
                    id="halfDayPeriod"
                    name="halfDayPeriod"
                    value={formData.halfDayPeriod}
                    onChange={handleInputChange}
                  >
                    <option value="morning">오전</option>
                    <option value="afternoon">오후</option>
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="reason">사유</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="휴가 신청 사유를 입력하세요"
                  rows="4"
                  required
                />
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    resetForm();
                    setError('');
                  }}
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '제출 중...' : (editingRequest ? '수정하기' : '신청하기')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>휴가 신청 내역이 없습니다</h3>
          <p>{filter !== 'all' ? `${filter} 상태의 휴가 신청이 없습니다` : '아직 휴가 신청 내역이 없습니다'}</p>
          <button 
            className="empty-action-btn"
            onClick={() => setShowForm(true)}
          >
            첫 휴가 신청하기
          </button>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-header">
                <div className="request-type">
                  <span className="type-icon">{getTypeIcon(request.type)}</span>
                  <span className="type-name">{request.type?.replace(/^\w/, c => c.toUpperCase())}</span>
                  {request.halfDay && <span className="half-day-badge">반차</span>}
                  {/* 관리자가 볼 때 신청자 이름 표시 */}
                  {(user?.role === 'admin' || user?.role === 'manager') && request.employee && (
                    <span className="employee-name" style={{ marginLeft: '10px', fontWeight: '600', color: '#333' }}>
                      {request.employee.name || request.employeeName || '직원'}
                    </span>
                  )}
                </div>
                <span className={`status-badge ${getStatusColor(request.status)}`}>
                  {request.status === 'pending' ? '대기중' : 
                   request.status === 'approved' ? '승인됨' : 
                   request.status === 'rejected' ? '거절됨' : 
                   request.status?.toUpperCase() || '대기중'}
                </span>
              </div>
              
              <div className="request-dates">
                <div className="date-info">
                  <span className="date-label">시작:</span>
                  <span className="date-value">{formatDate(request.startDate)}</span>
                </div>
                <div className="date-info">
                  <span className="date-label">종료:</span>
                  <span className="date-value">{formatDate(request.endDate)}</span>
                </div>
                <div className="duration-info">
                  <span className="duration-value">
                    {calculateDays(request.startDate, request.endDate, request.halfDay)} day{calculateDays(request.startDate, request.endDate, request.halfDay) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              {request.reason && (
                <div className="request-reason">
                  <span className="reason-label">사유:</span>
                  <p className="reason-text">{request.reason}</p>
                </div>
              )}
              
              {request.adminComment && (
                <div className="admin-comment">
                  <span className="comment-label">관리자 코멘트:</span>
                  <p className="comment-text">{request.adminComment}</p>
                </div>
              )}
              
              <div className="request-footer">
                <div className="request-meta">
                  <span className="submitted-date">
                    제출일: {formatDate(request.createdAt)}
                  </span>
                  {request.reviewedBy && (
                    <span className="reviewed-by">
                      검토자: {request.reviewedBy?.name}
                    </span>
                  )}
                </div>
                
                {/* 본인 휴가 신청 수정/삭제 */}
                {request.status === 'pending' && request.employeeId === user?.id && (
                  <div className="request-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(request)}
                    >
                      수정
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(request.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
                
                {/* 관리자/매니저 승인/거절 버튼 */}
                {request.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') && request.employeeId !== user?.id && (
                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(request.id)}
                      style={{ backgroundColor: '#34C759', color: 'white' }}
                    >
                      승인
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(request.id)}
                      style={{ backgroundColor: '#FF3B30', color: 'white' }}
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="requests-summary">
        <p>전체 {Array.isArray(requests) ? requests.length : 0}개 중 {filteredRequests.length}개 표시</p>
      </div>
    </div>
  );
};

export default LeaveRequest;