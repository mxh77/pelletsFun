import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFire, 
  faTruck, 
  faChartLine, 
  faEuroSign,
  faBoxes,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalRecharges: 0,
    currentStock: 0,
    totalSpent: 0,
    averagePrice: 0,
    monthlyConsumption: 0,
    lastDeliveryDate: null,
    lastRechargeDate: null,
    consumptionByMonth: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Recalculer le stock avant de récupérer les données
        await axios.post(`${process.env.REACT_APP_API_URL}/deliveries/recalculate-stock`);
        
        const [deliveriesRes, rechargesRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/deliveries`),
          axios.get(`${process.env.REACT_APP_API_URL}/recharges`)
        ]);

        const deliveries = deliveriesRes.data;
        const recharges = rechargesRes.data;

        // Calculs
        const totalDeliveries = deliveries.reduce((sum, d) => sum + d.quantity, 0);
        const totalRecharges = recharges.reduce((sum, r) => sum + r.quantity, 0);
        const currentStock = deliveries.reduce((sum, d) => sum + d.remainingQuantity, 0);
        const totalSpent = deliveries.reduce((sum, d) => sum + d.price, 0);
        const averagePrice = deliveries.length > 0 
          ? deliveries.reduce((sum, d) => sum + (d.price / d.quantity), 0) / deliveries.length 
          : 0;

        // Consommation par mois
        const consumptionByMonth = calculateMonthlyConsumption(recharges);
        const monthlyConsumption = consumptionByMonth.length > 0 
          ? consumptionByMonth.reduce((sum, m) => sum + m.quantity, 0) / consumptionByMonth.length
          : 0;

        // Dernières dates
        const lastDeliveryDate = deliveries.length > 0 
          ? new Date(Math.max(...deliveries.map(d => new Date(d.date))))
          : null;
        const lastRechargeDate = recharges.length > 0
          ? new Date(Math.max(...recharges.map(r => new Date(r.date))))
          : null;

        setStats({
          totalDeliveries,
          totalRecharges,
          currentStock,
          totalSpent,
          averagePrice,
          monthlyConsumption,
          lastDeliveryDate,
          lastRechargeDate,
          consumptionByMonth
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  const calculateMonthlyConsumption = (recharges) => {
    const monthMap = {};
    
    recharges.forEach(recharge => {
      const date = new Date(recharge.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthKey,
          quantity: 0,
          count: 0
        };
      }
      
      monthMap[monthKey].quantity += recharge.quantity;
      monthMap[monthKey].count += 1;
    });

    return Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month));
  };

  const getStockStatus = () => {
    if (stats.currentStock > 50) return { text: 'Excellent', variant: 'success' };
    if (stats.currentStock > 20) return { text: 'Bon', variant: 'info' };
    if (stats.currentStock > 10) return { text: 'Faible', variant: 'warning' };
    return { text: 'Critique', variant: 'danger' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="dashboard">
      <h2 className="mb-4">
        <FontAwesomeIcon icon={faChartLine} className="me-2" />
        Tableau de Bord
      </h2>

      {/* Cartes principales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stat-card stock-card">
            <Card.Body>
              <div className="stat-icon">
                <FontAwesomeIcon icon={faBoxes} size="2x" />
              </div>
              <div className="stat-content">
                <h6 className="stat-label">Stock Actuel</h6>
                <h2 className="stat-value">{stats.currentStock}</h2>
                <Badge bg={stockStatus.variant}>{stockStatus.text}</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card delivery-card">
            <Card.Body>
              <div className="stat-icon">
                <FontAwesomeIcon icon={faTruck} size="2x" />
              </div>
              <div className="stat-content">
                <h6 className="stat-label">Total Livraisons</h6>
                <h2 className="stat-value">{stats.totalDeliveries}</h2>
                <small className="text-muted">sacs livrés</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card consumption-card">
            <Card.Body>
              <div className="stat-icon">
                <FontAwesomeIcon icon={faFire} size="2x" />
              </div>
              <div className="stat-content">
                <h6 className="stat-label">Consommation</h6>
                <h2 className="stat-value">{stats.totalRecharges}</h2>
                <small className="text-muted">sacs consommés</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="stat-card price-card">
            <Card.Body>
              <div className="stat-icon">
                <FontAwesomeIcon icon={faEuroSign} size="2x" />
              </div>
              <div className="stat-content">
                <h6 className="stat-label">Dépense Totale</h6>
                <h2 className="stat-value">{stats.totalSpent.toFixed(0)}€</h2>
                <small className="text-muted">{stats.averagePrice.toFixed(2)}€/sac</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Statistiques détaillées */}
      <Row>
        <Col md={6}>
          <Card className="info-card">
            <Card.Header>
              <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
              Dernières Activités
            </Card.Header>
            <Card.Body>
              <div className="activity-item">
                <strong>Dernière livraison :</strong>
                <span className="ms-2">
                  {stats.lastDeliveryDate 
                    ? stats.lastDeliveryDate.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })
                    : 'Aucune'}
                </span>
              </div>
              <div className="activity-item mt-2">
                <strong>Dernier chargement :</strong>
                <span className="ms-2">
                  {stats.lastRechargeDate 
                    ? stats.lastRechargeDate.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })
                    : 'Aucun'}
                </span>
              </div>
              <div className="activity-item mt-2">
                <strong>Consommation moyenne :</strong>
                <span className="ms-2">{stats.monthlyConsumption.toFixed(1)} sacs/mois</span>
              </div>
              <div className="activity-item mt-2">
                <strong>Données calculées :</strong>
                <span className="ms-2">jusqu'au {new Date().toLocaleDateString('fr-FR')}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="info-card">
            <Card.Header>
              <FontAwesomeIcon icon={faChartLine} className="me-2" />
              Consommation Mensuelle
            </Card.Header>
            <Card.Body className="consumption-chart">
              {stats.consumptionByMonth.slice(0, 6).map((month, index) => {
                const maxQuantity = Math.max(...stats.consumptionByMonth.map(m => m.quantity));
                const percentage = (month.quantity / maxQuantity) * 100;
                
                return (
                  <div key={index} className="month-bar">
                    <div className="month-label">
                      {new Date(month.month + '-01').toLocaleDateString('fr-FR', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="bar-value">{month.quantity}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {stats.consumptionByMonth.length === 0 && (
                <p className="text-muted text-center">Aucune donnée disponible</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
