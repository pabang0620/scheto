import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './NoticeManagement.css';

const NoticeManagement = () => {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  
  // State management
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium',
    isPinned: false,
    expirationDate: '',
    targetRoles: ['employee', 'manager', 'admin']
  });

  // Mock data - Replace with actual API calls
  const mockNotices = [
    {
      id: 1,
      title: '시스템 점검 안내',
      content: '2024년 1월 15일 오후 10시부터 오전 2시까지 시스템 점검이 진행됩니다.',
      type: 'system',
      priority: 'high',
      isPinned: true,
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-10T09:00:00Z',
      expirationDate: '2024-01-16T00:00:00Z',
      author: 'Admin',
      readCount: 45,
      targetRoles: ['employee', 'manager', 'admin'],
      isActive: true
    },
    {
      id: 2,
      title: '휴가 신청 정책 변경',
      content: '2024년부터 휴가 신청 정책이 일부 변경되었습니다. 자세한 내용은 첨부 문서를 확인하세요.',
      type: 'policy',
      priority: 'medium',
      isPinned: false,
      createdAt: '2024-01-08T14:30:00Z',
      updatedAt: '2024-01-08T14:30:00Z',
      expirationDate: '2024-03-01T00:00:00Z',
      author: 'HR Manager',
      readCount: 23,
      targetRoles: ['employee', 'manager'],
      isActive: true
    },
    {
      id: 3,
      title: '신년 인사',
      content: '새해 복 많이 받으세요! 2024년도 모든 직원들이 건강하고 성공적인 한 해가 되길 바랍니다.',
      type: 'general',
      priority: 'low',
      isPinned: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      expirationDate: '2024-01-31T23:59:59Z',
      author: 'CEO',
      readCount: 67,
      targetRoles: ['employee', 'manager', 'admin'],
      isActive: true
    }
  ];

  useEffect(() => {
    // Simulate API loading
    setTimeout(() => {
      setNotices(mockNotices);
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and sort notices
  const filteredNotices = notices
    .filter(notice => {
      const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          notice.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || notice.type === filterType;
      const matchesPriority = filterPriority === 'all' || notice.priority === filterPriority;
      return matchesSearch && matchesType && matchesPriority;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

  // Pagination
  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotices = filteredNotices.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateNotice = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      type: 'general',
      priority: 'medium',
      isPinned: false,
      expirationDate: '',
      targetRoles: ['employee', 'manager', 'admin']
    });
    setShowModal(true);
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: notice.priority,
      isPinned: notice.isPinned,
      expirationDate: notice.expirationDate ? notice.expirationDate.split('T')[0] : '',
      targetRoles: notice.targetRoles
    });
    setShowModal(true);
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      setNotices(notices.filter(notice => notice.id !== noticeId));
    }
  };

  const handleTogglePin = async (noticeId) => {
    setNotices(notices.map(notice => 
      notice.id === noticeId 
        ? { ...notice, isPinned: !notice.isPinned }
        : notice
    ));
  };

  const handleToggleActive = async (noticeId) => {
    setNotices(notices.map(notice => 
      notice.id === noticeId 
        ? { ...notice, isActive: !notice.isActive }
        : notice
    ));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    
    const noticeData = {
      ...formData,
      author: user.name,
      createdAt: editingNotice ? editingNotice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readCount: editingNotice ? editingNotice.readCount : 0,
      isActive: true,
      id: editingNotice ? editingNotice.id : Date.now()
    };

    if (editingNotice) {
      setNotices(notices.map(notice => 
        notice.id === editingNotice.id ? noticeData : notice
      ));
    } else {
      setNotices([noticeData, ...notices]);
    }

    setShowModal(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'var(--color-error)';
      case 'medium': return 'var(--color-warning)';
      case 'low': return 'var(--color-success)';
      default: return 'var(--color-text-secondary)';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'system': return 'fa-cog';
      case 'policy': return 'fa-file-text';
      case 'event': return 'fa-calendar';
      case 'general': return 'fa-info-circle';
      default: return 'fa-bell';
    }
  };

  if (loading) {
    return (
      <div className="notice-management-loading">
        <div className="loading-spinner"></div>
        <p>공지사항을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="notice-management">
      {/* Header */}
      <div className="notice-management-header">
        <div className="header-left">
          <h1>
            <i className="fa-solid fa-bullhorn"></i>
            공지사항 관리
          </h1>
          <p>공지사항을 생성, 수정, 삭제할 수 있습니다.</p>
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={handleCreateNotice}
          >
            <i className="fa-solid fa-plus"></i>
            새 공지사항
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="notice-controls">
        <div className="controls-left">
          <div className="search-box">
            <i className="fa-solid fa-search"></i>
            <input
              type="text"
              placeholder="제목 또는 내용으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-controls">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">모든 유형</option>
              <option value="general">일반</option>
              <option value="system">시스템</option>
              <option value="policy">정책</option>
              <option value="event">이벤트</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">모든 우선순위</option>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>
        </div>
        <div className="controls-right">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <i className="fa-solid fa-table"></i>
            </button>
            <button
              className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
            >
              <i className="fa-solid fa-th"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="notice-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fa-solid fa-bell"></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{notices.length}</div>
            <div className="stat-label">전체 공지</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pinned">
            <i className="fa-solid fa-thumbtack"></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{notices.filter(n => n.isPinned).length}</div>
            <div className="stat-label">고정된 공지</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <i className="fa-solid fa-eye"></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">{notices.filter(n => n.isActive).length}</div>
            <div className="stat-label">활성 공지</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon expired">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="stat-info">
            <div className="stat-number">
              {notices.filter(n => n.expirationDate && new Date(n.expirationDate) < new Date()).length}
            </div>
            <div className="stat-label">만료된 공지</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="notice-content">
        {viewMode === 'table' ? (
          <div className="notice-table-container">
            <table className="notice-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => {
                        setSortBy('title');
                        setSortOrder(sortBy === 'title' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      제목
                      {sortBy === 'title' && (
                        <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </button>
                  </th>
                  <th>유형</th>
                  <th>우선순위</th>
                  <th>상태</th>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => {
                        setSortBy('readCount');
                        setSortOrder(sortBy === 'readCount' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      읽음
                      {sortBy === 'readCount' && (
                        <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </button>
                  </th>
                  <th>
                    <button
                      className="sort-btn"
                      onClick={() => {
                        setSortBy('createdAt');
                        setSortOrder(sortBy === 'createdAt' && sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                    >
                      생성일
                      {sortBy === 'createdAt' && (
                        <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                      )}
                    </button>
                  </th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotices.map((notice) => (
                  <tr key={notice.id} className={!notice.isActive ? 'inactive' : ''}>
                    <td>
                      <div className="notice-title">
                        {notice.isPinned && (
                          <i className="fa-solid fa-thumbtack pin-icon"></i>
                        )}
                        <span>{notice.title}</span>
                      </div>
                    </td>
                    <td>
                      <div className="notice-type">
                        <i className={`fa-solid ${getTypeIcon(notice.type)}`}></i>
                        <span>{notice.type}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="priority-badge"
                        style={{ color: getPriorityColor(notice.priority) }}
                      >
                        {notice.priority}
                      </span>
                    </td>
                    <td>
                      <div className="status-badges">
                        {notice.isPinned && (
                          <span className="badge badge-pinned">고정</span>
                        )}
                        <span className={`badge badge-${notice.isActive ? 'active' : 'inactive'}`}>
                          {notice.isActive ? '활성' : '비활성'}
                        </span>
                        {notice.expirationDate && new Date(notice.expirationDate) < new Date() && (
                          <span className="badge badge-expired">만료</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="read-count">
                        <i className="fa-solid fa-eye"></i>
                        {notice.readCount}
                      </div>
                    </td>
                    <td>
                      <div className="date-info">
                        <div>{formatDate(notice.createdAt)}</div>
                        {notice.expirationDate && (
                          <div className="expiry-date">
                            만료: {formatDate(notice.expirationDate)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleTogglePin(notice.id)}
                          title={notice.isPinned ? '고정 해제' : '고정'}
                        >
                          <i className={`fa-solid fa-thumbtack ${notice.isPinned ? 'pinned' : ''}`}></i>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleEditNotice(notice)}
                          title="수정"
                        >
                          <i className="fa-solid fa-edit"></i>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleToggleActive(notice.id)}
                          title={notice.isActive ? '비활성화' : '활성화'}
                        >
                          <i className={`fa-solid ${notice.isActive ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                        <button
                          className="btn-icon delete"
                          onClick={() => handleDeleteNotice(notice.id)}
                          title="삭제"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedNotices.length === 0 && (
              <div className="no-data">
                <i className="fa-solid fa-bell-slash"></i>
                <p>표시할 공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="notice-cards">
            {paginatedNotices.map((notice) => (
              <div key={notice.id} className={`notice-card ${!notice.isActive ? 'inactive' : ''}`}>
                <div className="card-header">
                  <div className="card-title">
                    {notice.isPinned && (
                      <i className="fa-solid fa-thumbtack pin-icon"></i>
                    )}
                    <h3>{notice.title}</h3>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleTogglePin(notice.id)}
                    >
                      <i className={`fa-solid fa-thumbtack ${notice.isPinned ? 'pinned' : ''}`}></i>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleEditNotice(notice)}
                    >
                      <i className="fa-solid fa-edit"></i>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteNotice(notice.id)}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <p>{notice.content}</p>
                </div>
                <div className="card-meta">
                  <div className="meta-row">
                    <div className="notice-type">
                      <i className={`fa-solid ${getTypeIcon(notice.type)}`}></i>
                      <span>{notice.type}</span>
                    </div>
                    <span
                      className="priority-badge"
                      style={{ color: getPriorityColor(notice.priority) }}
                    >
                      {notice.priority}
                    </span>
                  </div>
                  <div className="meta-row">
                    <div className="read-count">
                      <i className="fa-solid fa-eye"></i>
                      {notice.readCount}명 읽음
                    </div>
                    <div className="date-info">
                      {formatDate(notice.createdAt)}
                    </div>
                  </div>
                  {notice.expirationDate && (
                    <div className="expiry-info">
                      만료일: {formatDate(notice.expirationDate)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {paginatedNotices.length === 0 && (
              <div className="no-data">
                <i className="fa-solid fa-bell-slash"></i>
                <p>표시할 공지사항이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  {editingNotice ? '공지사항 수정' : '새 공지사항 작성'}
                </h2>
                <button
                  className="modal-close"
                  onClick={() => setShowModal(false)}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={handleSubmitForm} className="modal-form">
                <div className="form-group">
                  <label>제목 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    placeholder="공지사항 제목을 입력하세요"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>유형</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="general">일반</option>
                      <option value="system">시스템</option>
                      <option value="policy">정책</option>
                      <option value="event">이벤트</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>우선순위</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option value="low">낮음</option>
                      <option value="medium">보통</option>
                      <option value="high">높음</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>내용 *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    required
                    rows="6"
                    placeholder="공지사항 내용을 입력하세요"
                  />
                </div>

                <div className="form-group">
                  <label>만료일</label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>대상 역할</label>
                  <div className="checkbox-group">
                    {['employee', 'manager', 'admin'].map(role => (
                      <label key={role} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.targetRoles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                targetRoles: [...formData.targetRoles, role]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                targetRoles: formData.targetRoles.filter(r => r !== role)
                              });
                            }
                          }}
                        />
                        {role === 'employee' ? '직원' : role === 'manager' ? '매니저' : '관리자'}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                    />
                    공지사항 상단 고정
                  </label>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingNotice ? '수정' : '생성'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NoticeManagement;