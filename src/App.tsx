import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FleetPage from './pages/FleetPage';
import ReservationPage from './pages/ReservationPage';
import SuccessPage from './pages/SuccessPage';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flota" element={<FleetPage />} />
            <Route path="/rezervare" element={<ReservationPage />} />
            <Route path="/succes" element={<SuccessPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
