import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { fetchGoogleSheetData } from './services/googleSheetsService';

import Login from './components/Auth/Login';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import SalesPanel from './components/Sales/SalesPanel';
import DebtsPanel from './components/Debts/DebtsPanel';
import PaymentsPanel from './components/Payments/PaymentsPanel';
import Calendar from './components/Calendar/Calendar';
import CoursesPanel from './components/Courses/CoursesPanel';
import CertificatesPanel from './components/Certificates/CertificatesPanel';
import SettingsPanel from './components/Settings/SettingsPanel';

import './App.css';

import Particles from './components/ui/Particles/Particles';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppLayout = ({ children }) => {
  useEffect(() => {
    // ONE-TIME MIGRATION FOR PAYMENT METHODS IN LOCALSTORAGE
    try {
      const rawSales = localStorage.getItem('st_energy_sales');
      if (rawSales) {
        let sales = JSON.parse(rawSales);
        let changed = false;
        
        // Remove BCP sales
        const filteredSales = sales.filter(s => s.account !== 'BCP');
        if (filteredSales.length !== sales.length) changed = true;
        
        filteredSales.forEach(s => {
          if (s.account === 'Yape' || s.account === 'YAPE Mariela' || s.account === 'Yape Mariela') { s.account = 'YAPE MARIELA'; changed = true; }
          if (s.account === 'Interbank' || s.account === 'INTERBANK SOLES' || s.account === 'INTERBANK DOLARES') { s.account = 'INTERBANK'; changed = true; }
          
          if (s.payments) {
            const oldLen = s.payments.length;
            s.payments = s.payments.filter(p => p.account !== 'BCP');
            if (s.payments.length !== oldLen) changed = true;
            
            s.payments.forEach(p => {
               if (p.account === 'Yape' || p.account === 'YAPE Mariela' || p.account === 'Yape Mariela') { p.account = 'YAPE MARIELA'; changed = true; }
               if (p.account === 'Interbank' || p.account === 'INTERBANK SOLES' || p.account === 'INTERBANK DOLARES') { p.account = 'INTERBANK'; changed = true; }
            });
          }
        });
        
        if (changed) {
          localStorage.setItem('st_energy_sales', JSON.stringify(filteredSales));
          console.log('Migrated payment methods in localStorage');
        }
      }
    } catch (e) {
      console.error('Error during payment migration', e);
    }
  }, []);

  return (
    <div className="app-container">
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Particles 
          particleColors={['#ffffff', '#ffba0d', '#00E5FF']}
          particleCount={250}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <main className="main-content">
          <Header />
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      
      <Route path="/" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><Dashboard /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="/ventas" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><SalesPanel /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="/deudas" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><DebtsPanel /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/pagos" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><PaymentsPanel /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="/calendario" element={
        <PrivateRoute roles={['admin']}>
          <AppLayout><Calendar /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="/cursos" element={
        <PrivateRoute roles={['admin']}>
          <AppLayout><CoursesPanel /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/certificados" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><CertificatesPanel /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="/configuracion" element={
        <PrivateRoute roles={['admin', 'asesor1', 'asesor2']}>
          <AppLayout><SettingsPanel /></AppLayout>
        </PrivateRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Probar la conexión a la base de datos de Google Sheets
    fetchGoogleSheetData()
      .then(data => {
        console.log("✅ Conexión exitosa a Google Sheets!");
        console.log("📊 Datos obtenidos:", data);
      })
      .catch(error => {
        console.error("❌ Error al conectar con Google Sheets:", error);
      });
  }, []);

  return (
    <SettingsProvider>
      <AuthProvider>
        <Router basename="/sistema">
          <AppRoutes />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
