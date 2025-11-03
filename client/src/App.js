import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Tabs, Tab, Container, Navbar, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFire, faHome } from '@fortawesome/free-solid-svg-icons';
import Dashboard from './components/Dashboard';
import DeliveryForm from './components/DeliveryForm';
import DeliveryList from './components/DeliveryList';
import EditDeliveryForm from './components/EditDeliveryForm';
import RechargeForm from './components/RechargeForm';
import RechargeList from './components/RechargeList';
import EditRechargeForm from './components/EditRechargeForm';
import SeasonManager from './components/SeasonManager';
import BoilerManager from './components/BoilerManager';
import GmailConfig from './components/GmailConfig';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router basename="/">
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg" className="navbar-custom">
          <Container>
            <Navbar.Brand href="/">
              <FontAwesomeIcon icon={faFire} className="me-2" />
              <span className="brand-text">Pellets Tracker</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="ms-auto">
                <Link to="/" className="nav-link">
                  <FontAwesomeIcon icon={faHome} className="me-1" />
                  Accueil
                </Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="main-content">
          <Routes>
            <Route path="/" element={<TabsComponent />} />
            <Route path="/add-delivery" element={<DeliveryForm />} />
            <Route path="/edit-delivery/:id" element={<EditDeliveryForm />} />
            <Route path="/add-recharge" element={<RechargeForm />} />
            <Route path="/edit-recharge/:id" element={<EditRechargeForm />} />
          </Routes>
        </Container>

        <footer className="footer mt-5">
          <Container>
            <p className="text-center text-muted mb-0">
              © 2025 Pellets Tracker - Gestion de stock de pellets
            </p>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

const TabsComponent = () => (
  <div>
    <Dashboard />
    <Tabs defaultActiveKey="deliveries" id="main-tabs" className="mb-3 custom-tabs mt-5">
      <Tab eventKey="deliveries" title="📦 Livraisons">
        <DeliveryList />
      </Tab>
      <Tab eventKey="recharges" title="🔥 Chargements">
        <RechargeList />
      </Tab>
      <Tab eventKey="seasons" title="❄️ Saisons">
        <SeasonManager />
      </Tab>
      <Tab eventKey="boiler" title="🔥 Chaudière">
        <BoilerManager />
      </Tab>
      <Tab eventKey="gmail" title="📧 Gmail Auto">
        <GmailConfig />
      </Tab>
    </Tabs>
  </div>
);

export default App;