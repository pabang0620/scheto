import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/Common/PrivateRoute';
import RoleRoute from './components/Common/RoleRoute';
import Header from './components/Common/Header';
import Sidebar from './components/Common/Sidebar';
import BottomNav from './components/Common/BottomNav';
import MobileTabBar from './components/Layout/MobileTabBar';
import MobileHeader from './components/Layout/MobileHeader';
import FloatingActionButton from './components/shared/FloatingActionButton';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import EmployeeList from './components/Employee/EmployeeList';
import EmployeeForm from './components/Employee/EmployeeForm';
import EmployeeAbilities from './components/Employee/EmployeeAbilities';
import ScheduleCalendarDnD from './components/Schedule/ScheduleCalendarDnD';
import AutoGenerate from './components/Schedule/AutoGenerate';
import ScheduleAutoGenerator from './components/Schedule/ScheduleAutoGenerator';
import ScheduleManagement from './components/Schedule/ScheduleManagement';
import LeaveRequest from './components/Leave/LeaveRequest';
import CompanySettings from './components/Settings/CompanySettings';
import NoticeManagement from './components/Notice/NoticeManagement';
import Profile from './components/Profile/Profile';
import { RouteTransition } from './components/shared/PageTransition';
import './App.css';

const AppLayout = () => {
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwipeBack = () => {
    navigate(-1);
  };

  return (
    <NotificationProvider user={user}>
      <div className="app-layout">
        {/* Desktop Header */}
        <Header className="desktop-header" />
        
        {/* Mobile Header */}
        <MobileHeader />
        
        <div className="app-content">
          <Sidebar className="desktop-sidebar" />
        
        <main className="main-content">
          <RouteTransition onSwipeBack={handleSwipeBack} enableSwipeBack={true}>
            <Routes>
              {/* Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Employee Management */}
              <Route path="/employees" element={
                <RoleRoute requiredRole="manager">
                  <EmployeeList />
                </RoleRoute>
              } />
              <Route path="/employees/new" element={
                <RoleRoute requiredRole="manager">
                  <EmployeeForm />
                </RoleRoute>
              } />
              <Route path="/employees/:id/edit" element={
                <RoleRoute requiredRole="manager">
                  <EmployeeForm />
                </RoleRoute>
              } />
              <Route path="/employees/:id/abilities" element={
                <RoleRoute requiredRole="manager">
                  <EmployeeAbilities />
                </RoleRoute>
              } />
              
              {/* Schedule Management */}
              <Route path="/schedules" element={<ScheduleCalendarDnD />} />
              <Route path="/schedules/new" element={<ScheduleCalendarDnD />} />
              <Route path="/schedules/management" element={
                <RoleRoute requiredRole="manager">
                  <ScheduleManagement />
                </RoleRoute>
              } />
              <Route path="/schedules/auto-generate" element={
                <RoleRoute requiredRole="manager">
                  <ScheduleAutoGenerator />
                </RoleRoute>
              } />
              <Route path="/schedules/auto-generate-v1" element={
                <RoleRoute requiredRole="manager">
                  <AutoGenerate />
                </RoleRoute>
              } />
              
              {/* Leave Requests */}
              <Route path="/leave-requests" element={<LeaveRequest />} />
              <Route path="/leave-requests/new" element={<LeaveRequest />} />
              
              {/* Profile & Settings */}
              <Route path="/profile" element={<Profile />} />
              
              <Route path="/settings" element={
                <RoleRoute requiredRole="admin">
                  <CompanySettings />
                </RoleRoute>
              } />
              
              {/* Notice Management */}
              <Route path="/notices/manage" element={
                <RoleRoute requiredRole="admin">
                  <NoticeManagement />
                </RoleRoute>
              } />
              
              <Route path="/reports" element={
                <RoleRoute requiredRole="manager">
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center',
                    background: 'var(--color-background)',
                    minHeight: '100vh'
                  }}>
                    <h1>{t('pages.reportsPage')}</h1>
                    <p>{t('pages.comingSoon')}</p>
                  </div>
                </RoleRoute>
              } />
              
              <Route path="/help" element={
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center',
                  background: 'var(--color-background)',
                  minHeight: '100vh'
                }}>
                  <h1>{t('pages.helpSupport')}</h1>
                  <p>{t('pages.comingSoon')}</p>
                </div>
              } />
              
              {/* 404 Page */}
              <Route path="*" element={
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--color-background)'
                }}>
                  <div style={{ fontSize: '6rem', opacity: '0.5' }}>{t('pages.notFound')}</div>
                  <h1 style={{ color: 'var(--color-text-primary)', margin: 0 }}>{t('pages.pageNotFound')}</h1>
                  <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                    {t('pages.pageNotFoundDescription')}
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="btn btn-primary"
                  >
                    {t('pages.goBack')}
                  </button>
                </div>
              } />
            </Routes>
          </RouteTransition>
        </main>
        
        {/* Mobile Navigation - Replace BottomNav with new MobileTabBar */}
        <MobileTabBar />
        
        {/* Floating Action Button for quick actions - Hide on certain routes */}
        {!location.pathname.includes('/abilities') && 
         !location.pathname.includes('/edit') && 
         !location.pathname.includes('/new') && (
          <FloatingActionButton />
        )}
      </div>
      </div>
    </NotificationProvider>
  );
};

const AppContent = () => {
  return (
    <Router>
        <div className="app">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Private Routes */}
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            } />
          </Routes>
        </div>
    </Router>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;