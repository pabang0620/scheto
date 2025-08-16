import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { createEmployee, getEmployee, updateEmployee } from '../../services/api';
import './EmployeeForm.css';

const EmployeeForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    phone: '',
    address: '',
    birthDate: '',
    hireDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      fetchEmployee();
    }
  }, [id, isEditing]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await getEmployee(id);
      const employee = response.data;
      
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        password: '', // Don't populate password for editing
        role: employee.role || 'employee',
        department: employee.department || '',
        phone: employee.phone || '',
        address: employee.address || '',
        birthDate: employee.birthDate ? new Date(employee.birthDate).toISOString().split('T')[0] : '',
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : ''
      });
    } catch (err) {
      setError(t('employee.failedToLoadEmployee'));
      console.error('Employee fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError(t('employee.nameRequired'));
      return false;
    }
    if (!formData.email.trim()) {
      setError(t('employee.emailRequired'));
      return false;
    }
    if (!isEditing && !formData.password) {
      setError(t('employee.passwordRequired'));
      return false;
    }
    if (!isEditing && formData.password.length < 6) {
      setError(t('employee.passwordMinLength'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const submitData = { ...formData };
      
      // Remove empty password for editing
      if (isEditing && !submitData.password) {
        delete submitData.password;
      }

      if (isEditing) {
        await updateEmployee(id, submitData);
        setSuccess(t('employee.updateSuccess'));
      } else {
        await createEmployee(submitData);
        setSuccess(t('employee.createSuccess'));
      }
      
      setTimeout(() => {
        navigate('/employees');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || t(isEditing ? 'employee.updateFailed' : 'employee.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <div className="employee-form-container">
        <div className="loading-spinner">
          <div className="spinner"><span></span></div>
          <p>{t('employee.loadingEmployeeData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-form-container">
      <div className="form-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/employees')}
        >
          ← {t('employee.backToEmployees')}
        </button>
        <h1>{isEditing ? t('employee.editEmployee') : t('employee.addNewEmployee')}</h1>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit} className="employee-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-section">
            <h3>{t('employee.basicInformation')}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">{t('employee.fullName')} *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t('employee.enterFullName')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('employee.emailAddress')} *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={t('employee.enterEmailAddress')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">{t('employee.role')} *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="employee">{t('employee.employee')}</option>
                  <option value="manager">{t('employee.manager')}</option>
                  <option value="admin">{t('employee.admin')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="department">{t('employee.department')}</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder={t('employee.enterDepartment')}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>{t('employee.security')}</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="password">
                  {t('employee.password')} {!isEditing && '*'}
                  {isEditing && <span className="password-hint">({t('employee.passwordHint')})</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEditing}
                  placeholder={isEditing ? t('employee.enterNewPasswordOptional') : t('employee.enterPasswordMinChars')}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>{t('employee.contactInformation')}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="phone">{t('employee.phoneNumber')}</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('employee.enterPhoneNumber')}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="address">{t('employee.address')}</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder={t('employee.enterAddress')}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>{t('employee.employmentDetails')}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="birthDate">{t('employee.birthDate')}</label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="hireDate">{t('employee.hireDate')}</label>
                <input
                  type="date"
                  id="hireDate"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/employees')}
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (isEditing ? t('employee.updating') : t('employee.creating')) : (isEditing ? t('employee.updateEmployee') : t('employee.createEmployee'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;