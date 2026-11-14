import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ForbiddenPage } from './pages/ForbiddenPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.jsx';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage.jsx';
import { AdminAcademicPage } from './pages/admin/AdminAcademicPage.jsx';
import { AdminExamsPage } from './pages/admin/AdminExamsPage.jsx';
import { AdminFeesPage } from './pages/admin/AdminFeesPage.jsx';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage.jsx';
import { ReportsPage } from './pages/reports/ReportsPage.jsx';
import { TeacherSectionsPage } from './pages/teacher/TeacherSectionsPage.jsx';
import { AttendancePage } from './pages/teacher/AttendancePage.jsx';
import { SectionAttendanceSummary } from './pages/teacher/SectionAttendanceSummary.jsx';
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage.jsx';
import { MarksEntryPage } from './pages/teacher/MarksEntryPage.jsx';
import { GuardianChildrenPage } from './pages/guardian/GuardianChildrenPage.jsx';
import { ChildOverviewPage } from './pages/guardian/ChildOverviewPage.jsx';
import { GuardianFeesPage } from './pages/guardian/GuardianFeesPage.jsx';

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
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/academic" element={<AdminAcademicPage />} />
          <Route path="/admin/exams" element={<AdminExamsPage />} />
          <Route path="/admin/fees" element={<AdminFeesPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        </Route>
      </Route>

      {/* Teacher Role Routes */}
      <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/sections" element={<TeacherSectionsPage />} />
          <Route path="/teacher/attendance" element={<AttendancePage />} />
          <Route path="/teacher/reports" element={<ReportsPage />} />
          <Route path="/teacher/exams" element={<TeacherExamsPage />} />
          <Route path="/teacher/exams/:examId/marks" element={<MarksEntryPage />} />
        </Route>
      </Route>

      {/* Guardian Role Routes */}
      <Route element={<ProtectedRoute allowedRoles={['GUARDIAN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/guardian/children" element={<GuardianChildrenPage />} />
          <Route path="/guardian/children/:studentId" element={<ChildOverviewPage />} />
          <Route path="/guardian/fees" element={<GuardianFeesPage />} />
        </Route>
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

