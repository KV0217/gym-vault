import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Exercises from './pages/Exercises';
import Workouts from './pages/Workouts';
import NewWorkout from './pages/NewWorkout';
import WorkoutDetail from './pages/WorkoutDetail';
import Templates from './pages/Templates';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import AICoach from './pages/AICoach';
import Goals from './pages/Goals';
import Sleep from './pages/Sleep';
import Supplements from './pages/Supplements';
import Login from './pages/Login';
import Register from './pages/Register';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected App Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="ai" element={<AICoach />} />
            <Route path="exercises" element={<Exercises />} />
            <Route path="workouts" element={<Workouts />} />
            <Route path="workouts/new" element={<NewWorkout />} />
            <Route path="workouts/:id" element={<WorkoutDetail />} />
            <Route path="templates" element={<Templates />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="progress" element={<Progress />} />
            <Route path="goals" element={<Goals />} />
            <Route path="sleep" element={<Sleep />} />
            <Route path="supplements" element={<Supplements />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
