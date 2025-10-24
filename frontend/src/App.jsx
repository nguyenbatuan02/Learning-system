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
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// User Pages
import Home from './pages/Home';
import Upload from './pages/Upload';

// Question Banks
import QuestionBanks from './pages/QuestionBanks';
import QuestionBankDetail from './pages/QuestionBankDetail';
import EditQuestion from './pages/EditQuestion';
import AddQuestion from './pages/AddQuestion';
// Exams
import Exams from './pages/Exams';
import ExamDetail from './pages/ExamDetail';
import ExamEdit from './pages/ExamEdit';
import CreateExamFromBank from './pages/CreateExamFromBank';

// Take Exam
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';

// Practice
import Practice from './pages/Practice';
import PracticeSession from './pages/PracticeSession';

// Profile
import Profile from './pages/Profile';

// Admin Pages (commented out for now)
import AdminAnalytics from './pages/adminAnalytics';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* 👇 THÊM BrowserRouter ở đây */}
        <BrowserRouter>
          <Routes>
            {/* ============================================ */}
            {/* AUTH ROUTES */}
            {/* ============================================ */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />  
            <Route path="/reset-password" element={<ResetPassword />} />  

            {/* ============================================ */}
            {/* USER ROUTES */}
            {/* ============================================ */}
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


              {/* QUESTION BANKS */}
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
                path="/question-banks/:bankId/edit-question/:questionId"
                element={
                  <ProtectedRoute>
                    <EditQuestion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/question-banks/:bankId/add-question"
                element={
                  <ProtectedRoute>
                    <AddQuestion />
                  </ProtectedRoute>
                }
              />

              {/* EXAMS */}
              <Route
                path="/exams"
                element={
                  <ProtectedRoute>
                    <Exams />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exams/:examId"
                element={
                  <ProtectedRoute>
                    <ExamDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exams/:examId/edit"
                element={
                  <ProtectedRoute>
                    <ExamEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/question-banks/:bankId/create-exam"
                element={
                  <ProtectedRoute>
                    <CreateExamFromBank />
                  </ProtectedRoute>
                }
              />

              {/* TAKE EXAM */}
              <Route
                path="/exam/:examId/take"
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

              {/* PRACTICE */}
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

              {/* PROFILE */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
               {/* ============================================ */}
              {/* ADMIN ROUTES (Vẫn dùng MainLayout) */}
              {/* ============================================ */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>

          {/* Toast Notifications */}
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
