import { Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import BookingPage from './pages/BookingPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminLayout from './pages/admin/AdminLayout';
import AgendaPage from './pages/admin/AgendaPage';
import HoursPage from './pages/admin/HoursPage';
import LoginPage from './pages/admin/LoginPage';
import ServicesPage from './pages/admin/ServicesPage';

export default function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reservar" element={<BookingPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AgendaPage />} />
              <Route path="servicios" element={<ServicesPage />} />
              <Route path="horario" element={<HoursPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
