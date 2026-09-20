// ─────────────────────────────────────────────────────────────
// AppRoutes — نقشه‌ی مسیرها (M14-A: شاخه‌های نقش‌محور)
//
// Public:  /                        (PublicLayout → Landing)
// Auth:    /login /register         (AuthLayout)
// Private: /dashboard               → redirect نقش‌محور
//          /client/dashboard        (ProtectedRoute → RoleGuard CLIENT)
//          /specialist/dashboard    (ProtectedRoute → RoleGuard SPECIALIST)
//          /admin/dashboard         (ProtectedRoute → RoleGuard ADMIN)
// Errors:  /403 /404 + catch-all
// ─────────────────────────────────────────────────────────────

import { Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import AuthLayout from '../layouts/AuthLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import ProtectedRoute from './ProtectedRoute'
import RoleGuard from './RoleGuard'
import LandingPage from '../pages/public/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ClientDashboardPage from '../pages/client/ClientDashboardPage'
import ClientProjectsPage from '../pages/client/ClientProjectsPage'
import ClientProjectNewPage from '../pages/client/ClientProjectNewPage'
import ClientProjectDetailPage from '../pages/client/ClientProjectDetailPage'
import ClientProjectEditPage from '../pages/client/ClientProjectEditPage'
import SpecialistDashboardPage from '../pages/specialist/SpecialistDashboardPage'
import SpecialistRecommendedPage from '../pages/specialist/SpecialistRecommendedPage'
import SpecialistRecommendationDetailPage from '../pages/specialist/SpecialistRecommendationDetailPage'
import SpecialistProfilePage from '../pages/specialist/SpecialistProfilePage'
import SpecialistProjectWorkspacePage from '../pages/specialist/SpecialistProjectWorkspacePage'
import SpecialistTaskDetailPage from '../pages/specialist/SpecialistTaskDetailPage'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import ForbiddenPage from '../pages/errors/ForbiddenPage'
import NotFoundPage from '../pages/errors/NotFoundPage'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/roles'

/** /dashboard → داشبورد نقش کاربر (زیر ProtectedRoute؛ user همیشه موجود است) */
function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={getDashboardPath(user.role)} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* عمومی */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* ورود/ثبت‌نام */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* احراز‌هویت‌شده */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* کارفرما */}
        <Route element={<RoleGuard allow="CLIENT" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/client/dashboard" element={<ClientDashboardPage />} />
            <Route path="/client/projects" element={<ClientProjectsPage />} />
            <Route path="/client/projects/new" element={<ClientProjectNewPage />} />
            <Route path="/client/projects/:projectId" element={<ClientProjectDetailPage />} />
            <Route path="/client/projects/:projectId/edit" element={<ClientProjectEditPage />} />
          </Route>
        </Route>

        {/* متخصص */}
        <Route element={<RoleGuard allow="SPECIALIST" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/specialist/dashboard" element={<SpecialistDashboardPage />} />
            <Route
              path="/specialist/recommended-projects"
              element={<SpecialistRecommendedPage />}
            />
            <Route
              path="/specialist/recommended-projects/:projectId"
              element={<SpecialistRecommendationDetailPage />}
            />
            <Route path="/specialist/profile" element={<SpecialistProfilePage />} />
            <Route
              path="/specialist/projects/:projectId"
              element={<SpecialistProjectWorkspacePage />}
            />
            <Route
              path="/specialist/projects/:projectId/tasks/:taskId"
              element={<SpecialistTaskDetailPage />}
            />
          </Route>
        </Route>

        {/* مدیر سیستم */}
        <Route element={<RoleGuard allow="ADMIN" />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Route>

      {/* خطاها */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
