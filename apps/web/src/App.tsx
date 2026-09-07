import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Appointments from './routes/Appointments';
import Availability from './routes/Availability';
import Book from './routes/Book';
// import Consult from './routes/Consult'; // chat consultation hidden for now
import Dashboard from './routes/Dashboard';
import DoctorProfile from './routes/DoctorProfile';
import Doctors from './routes/Doctors';
import ForgotPassword from './routes/ForgotPassword';
import Login from './routes/Login';
import MedicalHistory from './routes/MedicalHistory';
import MyDoctors from './routes/MyDoctors';
import Patients from './routes/Patients';
import Prescription from './routes/Prescription';
import Profile from './routes/Profile';
import Register from './routes/Register';
import ResetPassword from './routes/ResetPassword';
import VerifyEmail from './routes/VerifyEmail';
import VideoCall from './routes/VideoCall';

const ChartPreview = lazy(() => import('./routes/__ChartPreview'));

const protect = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

/** Every navigation lands at the top of the page, so the header is in view
 *  after a back/forward move, not wherever the previous screen was scrolled. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/__chart" element={<ChartPreview />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />

      <Route path="/" element={protect(<Dashboard />)} />
      <Route path="/appointments" element={protect(<Appointments />)} />
      {/* Chat consultation hidden for now — <Route path="/consult/:appointmentId" element={protect(<Consult />)} /> */}
      <Route path="/consult/:appointmentId/video" element={protect(<VideoCall />)} />
      <Route
        path="/appointments/:appointmentId/prescription"
        element={protect(<Prescription />)}
      />
      <Route path="/history" element={protect(<MedicalHistory />)} />
      <Route path="/my-doctors" element={protect(<MyDoctors />)} />
      <Route path="/my-doctors/:doctorId" element={protect(<MedicalHistory />)} />
      <Route path="/patients" element={protect(<Patients />)} />
      <Route path="/patients/:patientId/history" element={protect(<MedicalHistory />)} />
      <Route path="/doctors" element={protect(<Doctors />)} />
      <Route path="/doctors/:id" element={protect(<DoctorProfile />)} />
      <Route path="/book" element={protect(<Book />)} />
      <Route path="/availability" element={protect(<Availability />)} />
      <Route path="/profile" element={protect(<Profile />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
