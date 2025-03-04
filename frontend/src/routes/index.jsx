import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Add more routes here as we build them */}
    </Routes>
  );
};

export default AppRoutes; 