import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useQualityMetrics } from "@/hooks/useQualityMetrics";
import { AuthProvider } from "./components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import QuestionBankManager from "./pages/admin/QuestionBankManager";
import PendingApprovals from "./pages/admin/PendingApprovals";
import BulkImportPage from "./pages/admin/BulkImportPage";
import UserManagement from "./pages/admin/UserManagement";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AILogs from "./pages/admin/AILogs";
import TOSPage from "./pages/teacher/TOSPage";
import IntelligentTestGenerator from "./pages/teacher/IntelligentTestGenerator";
import MyTests from "./pages/teacher/MyTests";
import TestPreview from "./pages/teacher/TestPreview";
import GeneratedTestPage from "./pages/teacher/GeneratedTestPage";
import TeacherHistory from "./pages/teacher/History";
import TeacherReports from "./pages/teacher/Reports";
import TeacherSettings from "./pages/teacher/Settings";
import ProfessionalExport from "./pages/ProfessionalExport";
import Rubrics from "./pages/Rubrics";
import Tests from "./pages/Tests";
import Collaboration from "./pages/Collaboration";
import Quality from "./pages/Quality";
import TestAssembly from "./pages/TestAssembly";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/layout/AdminLayout";
import { TeacherLayout } from "./components/layout/TeacherLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Initialize automated metrics collection
  useQualityMetrics();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Admin Routes - Professional Dark Theme */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <Routes>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="question-bank" element={<QuestionBankManager />} />
                        <Route path="approvals" element={<PendingApprovals />} />
                        <Route path="bulk-import" element={<BulkImportPage />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="analytics" element={<AdminAnalytics />} />
                        <Route path="ai-logs" element={<AILogs />} />
                        <Route path="quality" element={<Quality />} />
                        <Route path="test-assembly" element={<TestAssembly />} />
                        <Route path="tests" element={<Tests />} />
                        <Route path="collaboration" element={<Collaboration />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Routes>
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Teacher Routes - Clean Light Theme */}
              <Route 
                path="/teacher/*" 
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <TeacherLayout>
                      <Routes>
                        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
                        <Route path="dashboard" element={<TeacherDashboard />} />
                        <Route path="tos" element={<TOSPage />} />
                        <Route path="generate-test" element={<IntelligentTestGenerator />} />
                        <Route path="my-tests" element={<MyTests />} />
                        <Route path="test/:testId" element={<TestPreview />} />
                        <Route path="generated-test/:testId" element={<GeneratedTestPage />} />
                        <Route path="preview-test/:testId" element={<GeneratedTestPage />} />
                        <Route path="history" element={<TeacherHistory />} />
                        <Route path="reports" element={<TeacherReports />} />
                        <Route path="export" element={<ProfessionalExport />} />
                        <Route path="rubrics" element={<Rubrics />} />
                        <Route path="tests" element={<Tests />} />
                        <Route path="collaboration" element={<Collaboration />} />
                        <Route path="settings" element={<TeacherSettings />} />
                      </Routes>
                    </TeacherLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
