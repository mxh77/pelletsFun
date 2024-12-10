import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Tabs, Tab } from 'react-bootstrap';
import DeliveryForm from './components/DeliveryForm';
import DeliveryList from './components/DeliveryList';
import EditDeliveryForm from './components/EditDeliveryForm'; // Importer le formulaire de modification des livraisons
import RechargeForm from './components/RechargeForm';
import RechargeList from './components/RechargeList';
import EditRechargeForm from './components/EditRechargeForm'; // Importer le formulaire de modification des chargements
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router basename="/pelletsFun">
      <div className="App container">
        <header className="App-header">
          <h1 className="my-4">Pellets Tracker</h1>
          <nav>
            <Link to="/" className="btn btn-primary mr-2">Accueil</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<TabsComponent />} />
          <Route path="/add-delivery" element={<DeliveryForm />} />
          <Route path="/edit-delivery/:id" element={<EditDeliveryForm />} /> {/* Ajouter la route pour EditDeliveryForm */}
          <Route path="/add-recharge" element={<RechargeForm />} />
          <Route path="/edit-recharge/:id" element={<EditRechargeForm />} /> {/* Ajouter la route pour EditRechargeForm */}
        </Routes>
      </div>
    </Router>
  );
}

const TabsComponent = () => (
  <Tabs defaultActiveKey="deliveries" id="uncontrolled-tab-example" className="mb-3">
    <Tab eventKey="deliveries" title="Livraisons">
      <DeliveryList />
    </Tab>
    <Tab eventKey="recharges" title="Chargements">
      <RechargeList />
    </Tab>
  </Tabs>
);

export default App;