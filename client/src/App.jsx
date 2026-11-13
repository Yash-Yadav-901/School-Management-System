import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ForbiddenPage } from './pages/ForbiddenPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { AdminDashboardPlaceholder } from './pages/admin/AdminDashboardPlaceholder.jsx';
import { TeacherSectionsPlaceholder } from './pages/teacher/TeacherSectionsPlaceholder.jsx';
import { GuardianChildrenPlaceholder } from './pages/guardian/GuardianChildrenPlaceholder.jsx';

function RootRedirect() {
  const { user, isAuthenticated, isLoading, getRoleHome } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.role)} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Admin Role Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/students" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/academic" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/exams" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/fees" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/reports" element={<AdminDashboardPlaceholder />} />
          <Route path="/admin/audit-logs" element={<AdminDashboardPlaceholder />} />
        </Route>
      </Route>

      {/* Teacher Role Routes */}
      <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/sections" element={<TeacherSectionsPlaceholder />} />
          <Route path="/teacher/exams" element={<TeacherSectionsPlaceholder />} />
          <Route path="/teacher/reports" element={<TeacherSectionsPlaceholder />} />
        </Route>
      </Route>

      {/* Guardian Role Routes */}
      <Route element={<ProtectedRoute allowedRoles={['GUARDIAN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/guardian/children" element={<GuardianChildrenPlaceholder />} />
          <Route path="/guardian/fees" element={<GuardianChildrenPlaceholder />} />
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
