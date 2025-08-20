import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hireDate: ''
  });
  
  // Work preferences
  const [preferences, setPreferences] = useState({
    preferDays: [],
    avoidDays: [],
    fixedOffDays: [],
    preferredStartTime: '09:00',
    preferredEndTime: '18:00'
  });
  
  // Work statistics
  const [statistics, setStatistics] = useState({
    thisMonthHours: 0,
    thisMonthDays: 0,
    upcomingSchedules: [],
    recentLeaves: []
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const weekDays = [
    { value: 'monday', label: '월요일', labelEn: 'Monday' },
    { value: 'tuesday', label: '화요일', labelEn: 'Tuesday' },
    { value: 'wednesday', label: '수요일', labelEn: 'Wednesday' },
    { value: 'thursday', label: '목요일', labelEn: 'Thursday' },
    { value: 'friday', label: '금요일', labelEn: 'Friday' },
    { value: 'saturday', label: '토요일', labelEn: 'Saturday' },
    { value: 'sunday', label: '일요일', labelEn: 'Sunday' }
  ];

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch all profile related data
      const [profileRes, preferencesRes, statsRes] = await Promise.all([
        fetch('/api/users/profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users/preferences', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users/statistics', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setProfileData({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          department: profile.department || '',
          position: profile.position || '',
          hireDate: profile.hireDate ? profile.hireDate.split('T')[0] : ''
        });
      }
      
      if (preferencesRes.ok) {
        const prefs = await preferencesRes.json();
        setPreferences({
          preferDays: prefs.preferDays || [],
          avoidDays: prefs.avoidDays || [],
          fixedOffDays: prefs.fixedOffDays || [],
          preferredStartTime: prefs.preferredStartTime || '09:00',
          preferredEndTime: prefs.preferredEndTime || '18:00'
        });
      }
      
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStatistics(stats);
      }
      
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      showMessage('error', '프로필 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });
      
      if (response.ok) {
        const updated = await response.json();
        updateUser(updated.user);
        showMessage('success', '프로필이 업데이트되었습니다');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      showMessage('error', '프로필 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        showMessage('success', '근무 선호도가 저장되었습니다');
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      showMessage('error', '선호도 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', '새 비밀번호가 일치하지 않습니다');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('error', '비밀번호는 최소 6자 이상이어야 합니다');
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      if (response.ok) {
        showMessage('success', '비밀번호가 변경되었습니다');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        showMessage('error', error.message || '비밀번호 변경에 실패했습니다');
      }
    } catch (error) {
      showMessage('error', '비밀번호 변경에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (type, day) => {
    setPreferences(prev => ({
      ...prev,
      [type]: prev[type].includes(day)
        ? prev[type].filter(d => d !== day)
        : [...prev[type], day]
    }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>프로필 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>마이 페이지</h1>
      </div>

      {message.text && (
        <motion.div 
          className={`message ${message.type}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <i className={`fas fa-${message.type === 'success' ? 'check' : 'exclamation'}-circle`}></i>
          {message.text}
        </motion.div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <i className="fas fa-user"></i>
          내 정보
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <i className="fas fa-calendar-check"></i>
          근무 선호도
        </button>
        <button 
          className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          <i className="fas fa-chart-bar"></i>
          근무 통계
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-lock"></i>
          보안
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'info' && (
          <motion.div
            key="info"
            className="tab-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <h2>기본 정보</h2>
              
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>이메일</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>전화번호</label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="010-0000-0000"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>부서</label>
                  <input
                    type="text"
                    value={profileData.department}
                    onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>직급</label>
                  <input
                    type="text"
                    value={profileData.position}
                    onChange={(e) => setProfileData({...profileData, position: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>입사일</label>
                <input
                  type="date"
                  value={profileData.hireDate}
                  onChange={(e) => setProfileData({...profileData, hireDate: e.target.value})}
                />
              </div>
              
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? '저장 중...' : '정보 저장'}
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            className="tab-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="preferences-section">
              <h2>근무 선호도 설정</h2>
              <p className="section-desc">
                자동 스케줄 생성 시 반영됩니다
              </p>
              
              <div className="preference-group">
                <h3>
                  <i className="fas fa-heart"></i>
                  선호하는 근무 요일
                </h3>
                <div className="day-selector">
                  {weekDays.map(day => (
                    <label key={day.value} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={preferences.preferDays.includes(day.value)}
                        onChange={() => togglePreference('preferDays', day.value)}
                      />
                      <span className="day-label">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="preference-group">
                <h3>
                  <i className="fas fa-ban"></i>
                  피하고 싶은 요일
                </h3>
                <div className="day-selector">
                  {weekDays.map(day => (
                    <label key={day.value} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={preferences.avoidDays.includes(day.value)}
                        onChange={() => togglePreference('avoidDays', day.value)}
                      />
                      <span className="day-label">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="preference-group">
                <h3>
                  <i className="fas fa-calendar-times"></i>
                  고정 휴무일
                </h3>
                <div className="day-selector">
                  {weekDays.map(day => (
                    <label key={day.value} className="day-checkbox">
                      <input
                        type="checkbox"
                        checked={preferences.fixedOffDays.includes(day.value)}
                        onChange={() => togglePreference('fixedOffDays', day.value)}
                      />
                      <span className="day-label">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="preference-group">
                <h3>
                  <i className="fas fa-clock"></i>
                  선호 근무 시간
                </h3>
                <div className="time-selector">
                  <div className="form-group">
                    <label>시작 시간</label>
                    <input
                      type="time"
                      value={preferences.preferredStartTime}
                      onChange={(e) => setPreferences({...preferences, preferredStartTime: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>종료 시간</label>
                    <input
                      type="time"
                      value={preferences.preferredEndTime}
                      onChange={(e) => setPreferences({...preferences, preferredEndTime: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <button 
                className="save-btn" 
                onClick={handlePreferencesUpdate}
                disabled={saving}
              >
                {saving ? '저장 중...' : '선호도 저장'}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'statistics' && (
          <motion.div
            key="statistics"
            className="tab-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="statistics-section">
              <h2>이번 달 근무 통계</h2>
              
              <div className="stat-cards">
                <div className="stat-card">
                  <i className="fas fa-clock"></i>
                  <div className="stat-value">{statistics.thisMonthHours}</div>
                  <div className="stat-label">총 근무 시간</div>
                </div>
                
                <div className="stat-card">
                  <i className="fas fa-calendar-check"></i>
                  <div className="stat-value">{statistics.thisMonthDays}</div>
                  <div className="stat-label">근무 일수</div>
                </div>
              </div>
              
              <div className="upcoming-schedules">
                <h3>다가오는 일정</h3>
                {statistics.upcomingSchedules.length > 0 ? (
                  <div className="schedule-list">
                    {statistics.upcomingSchedules.map((schedule, index) => (
                      <div key={index} className="schedule-item">
                        <div className="schedule-date">
                          {new Date(schedule.date).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="schedule-time">
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">예정된 일정이 없습니다</p>
                )}
              </div>
              
              <div className="recent-leaves">
                <h3>최근 휴가 내역</h3>
                {statistics.recentLeaves.length > 0 ? (
                  <div className="leave-list">
                    {statistics.recentLeaves.map((leave, index) => (
                      <div key={index} className="leave-item">
                        <div className="leave-date">
                          {new Date(leave.startDate).toLocaleDateString('ko-KR')} - 
                          {new Date(leave.endDate).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="leave-type">{leave.type}</div>
                        <div className={`leave-status ${leave.status}`}>
                          {leave.status === 'approved' ? '승인됨' : 
                           leave.status === 'pending' ? '대기중' : '거절됨'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-data">휴가 내역이 없습니다</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            key="security"
            className="tab-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="security-section">
              <h2>비밀번호 변경</h2>
              
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label>현재 비밀번호</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>새 비밀번호</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    required
                    minLength="6"
                  />
                  <small>최소 6자 이상 입력하세요</small>
                </div>
                
                <div className="form-group">
                  <label>새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    required
                  />
                </div>
                
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;