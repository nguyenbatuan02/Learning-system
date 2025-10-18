import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// User Pages
import Home from './pages/Home';
import Upload from './pages/Upload';
import QuestionBanks from './pages/QuestionBanks';
import QuestionBankDetail from './pages/QuestionBankDetail';
import CreateExam from './pages/CreateExam';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import Practice from './pages/Practice';
import PracticeSession from './pages/PracticeSession';
import Profile from './pages/Profile';

// Admin Pages
// import AdminDashboard from './pages/admin/Dashboard';
// import AdminUsers from './pages/admin/Users';
// import AdminReports from './pages/admin/Reports';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User Routes */}
          <Route element={<MainLayout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <Upload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks"
              element={
                <ProtectedRoute>
                  <QuestionBanks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/question-banks/:bankId"
              element={
                <ProtectedRoute>
                  <QuestionBankDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-exam/:bankId"
              element={
                <ProtectedRoute>
                  <CreateExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:examId"
              element={
                <ProtectedRoute>
                  <TakeExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:examId/result"
              element={
                <ProtectedRoute>
                  <ExamResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <ProtectedRoute>
                  <Practice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/practice/:sessionId"
              element={
                <ProtectedRoute>
                  <PracticeSession />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Admin Routes */}
          {/* <Route
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route> */}
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;