import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AppRoutes from './routes';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <GoogleOAuthProvider clientId="1009859219635-jpmqpp4hvpuj2j85vjn7g700pvpbcb3d.apps.googleusercontent.com">
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <main className="flex-1 w-full">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
