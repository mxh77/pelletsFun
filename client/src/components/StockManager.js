import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrash, faPlus, faSync, faEdit, faArrowDown, faArrowRight,
  faTruck, faFire, faBoxes, faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import ConnectionLines from './ConnectionLines';
import './StockManager.css';

const StockManager = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [viewMode, setViewMode] = useState('graph'); // 'table', 'graph'
  const [stockAnalysis, setStockAnalysis] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deliveriesRes, rechargesRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/deliveries`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/recharges`)
      ]);
      
      setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
      setRecharges(Array.isArray(rechargesRes.data) ? rechargesRes.data : []);
      calculateStockAnalysis(deliveriesRes.data, rechargesRes.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setMessage('Erreur lors du chargement des données');
      setDeliveries([]);
      setRecharges([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStockAnalysis = (deliveryData, rechargeData) => {
    const totalDelivered = deliveryData.reduce((sum, d) => sum + d.quantity, 0);
    const totalConsumed = rechargeData.reduce((sum, r) => sum + r.quantity, 0);
    const currentStock = totalDelivered - totalConsumed;
    
    // Calcul du prix moyen pondéré (delivery.price est le prix total de la livraison)
    const totalValue = deliveryData.reduce((sum, d) => sum + d.price, 0);
    const avgPrice = totalDelivered > 0 ? totalValue / totalDelivered : 0;
    
    setStockAnalysis({
      totalDelivered,
      totalConsumed,
      currentStock,
      avgPrice,
      totalValue: currentStock * avgPrice
    });
  };

  const handleDeleteDelivery = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette livraison ?')) return;
    
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/deliveries/${id}`);
      setMessage('Livraison supprimée avec succès');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMessage('Erreur lors de la suppression');
    }
  };

  const handleDeleteRecharge = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce chargement ?')) return;
    
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/recharges/${id}`);
      setMessage('Chargement supprimé avec succès');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMessage('Erreur lors de la suppression');
    }
  };

  const handleRecalculateStock = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/deliveries/recalculate-stock`);
      setMessage('Stock recalculé avec succès');
      loadData();
    } catch (error) {
      console.error('Erreur lors du recalcul:', error);
      setMessage('Erreur lors du recalcul du stock');
    }
  };



  // Calculer l'historique complet des consommations
  const calculateHistoricalConsumption = () => {
    // Créer une copie des livraisons avec stock disponible complet
    const deliveriesStock = deliveries.map(delivery => ({
      ...delivery,
      availableStock: delivery.quantity,
      date: new Date(delivery.date)
    })).sort((a, b) => a.date - b.date); // Trier par date croissante (FIFO)
    
    // Trier les chargements par date pour les traiter chronologiquement
    const sortedRecharges = [...recharges]
      .map(r => ({ ...r, date: new Date(r.date) }))
      .sort((a, b) => a.date - b.date);
    
    // Créer un mapping des liens pour chaque chargement
    const rechargeLinks = {};
    
    // Traiter chaque chargement dans l'ordre chronologique
    sortedRecharges.forEach(recharge => {
      const links = [];
      let remainingQuantity = recharge.quantity;
      
      // Consommer depuis les livraisons disponibles (FIFO)
      for (const delivery of deliveriesStock) {
        if (remainingQuantity <= 0) break;
        if (delivery.availableStock > 0) {
          const usedQuantity = Math.min(delivery.availableStock, remainingQuantity);
          
          links.push({
            deliveryId: delivery._id,
            quantity: usedQuantity,
            percentage: (usedQuantity / recharge.quantity) * 100,
            deliveryDate: delivery.date,
            rechargeDate: recharge.date
          });
          
          // Réduire le stock disponible de cette livraison
          delivery.availableStock -= usedQuantity;
          remainingQuantity -= usedQuantity;
        }
      }
      
      rechargeLinks[recharge._id] = links;
    });
    
    return rechargeLinks;
  };

  // Calculer les liens pour un chargement spécifique
  const calculateLinks = (recharge) => {
    const historicalLinks = calculateHistoricalConsumption();
    return historicalLinks[recharge._id] || [];
  };



  return (
    <div className="stock-manager">
      <div className="stock-header">
        <h2>📦🔥 Gestion Stock Pellets</h2>
        <p>Vue unifiée des livraisons et chargements avec liens visuels</p>
      </div>

      {/* Résumé du Stock */}
      {stockAnalysis && (
        <div className="stock-summary">
          <div className="summary-cards">
            <div className="summary-card delivered">
              <FontAwesomeIcon icon={faTruck} className="card-icon" />
              <div className="card-content">
                <h3>{stockAnalysis.totalDelivered}</h3>
                <p>Sacs Livrés</p>
              </div>
            </div>
            <div className="summary-card consumed">
              <FontAwesomeIcon icon={faFire} className="card-icon" />
              <div className="card-content">
                <h3>{stockAnalysis.totalConsumed}</h3>
                <p>Sacs Consommés</p>
              </div>
            </div>
            <div className="summary-card remaining">
              <FontAwesomeIcon icon={faBoxes} className="card-icon" />
              <div className="card-content">
                <h3>{stockAnalysis.currentStock}</h3>
                <p>Stock Restant</p>
              </div>
            </div>
            <div className="summary-card value">
              <FontAwesomeIcon icon={faChartLine} className="card-icon" />
              <div className="card-content">
                <h3>{stockAnalysis.totalValue.toFixed(2)}€</h3>
                <p>Valeur Stock</p>
                <small>{stockAnalysis.avgPrice.toFixed(2)}€/sac</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contrôles */}
      <div className="stock-controls">
        <div className="view-controls">
          <h4>Vue:</h4>
          <div className="btn-group">
            <button 
              className={`btn ${viewMode === 'graph' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('graph')}
            >
              🔗 Flux Détaillés
            </button>
            <button 
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('table')}
            >
              📊 Tableau
            </button>
          </div>
        </div>

        <div className="action-controls">
          <Link to="/add-delivery" className="btn btn-success">
            <FontAwesomeIcon icon={faPlus} /> Nouvelle Livraison
          </Link>
          <Link to="/add-recharge" className="btn btn-warning">
            <FontAwesomeIcon icon={faPlus} /> Nouveau Chargement
          </Link>
          <button 
            onClick={handleRecalculateStock}
            disabled={loading}
            className="btn btn-info"
          >
            <FontAwesomeIcon icon={faSync} /> Recalculer Stock
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Erreur') ? 'alert-danger' : 'alert-success'}`}>
          {message}
          <button 
            type="button" 
            className="close" 
            onClick={() => setMessage('')}
          >
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Vue Tableau (existante mais améliorée) */}
      {viewMode === 'table' && (
        <div className="table-view">
          <div className="row">
            <div className="col-md-6">
              <h3>📦 Livraisons</h3>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Quantité</th>
                      <th>Restant</th>
                      <th>Prix Total</th>
                      <th>Prix/sac</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map(delivery => (
                      <tr key={delivery._id}>
                        <td>{new Date(delivery.date).toLocaleDateString('fr-FR')}</td>
                        <td>{delivery.quantity}</td>
                        <td>
                          {delivery.remainingQuantity}
                          <div className="progress" style={{ height: '4px', marginTop: '4px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ 
                                width: `${(delivery.remainingQuantity / delivery.quantity) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </td>
                        <td><strong>{delivery.price}€</strong></td>
                        <td>{(delivery.price / delivery.quantity).toFixed(2)}€</td>
                        <td>
                          <Link to={`/edit-delivery/${delivery._id}`} className="btn btn-sm btn-outline-primary mr-1">
                            <FontAwesomeIcon icon={faEdit} />
                          </Link>
                          <button 
                            onClick={() => handleDeleteDelivery(delivery._id)}
                            className="btn btn-sm btn-outline-danger"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-md-6">
              <h3>🔥 Chargements</h3>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Quantité</th>
                      <th>Coût Total</th>
                      <th>Prix/sac</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recharges.map(recharge => {
                      // Calculer le prix moyen par sac pour ce chargement
                      const links = calculateLinks(recharge);
                      const avgPricePerSac = links.length > 0 ? 
                        (links.reduce((sum, link) => {
                          const delivery = deliveries.find(d => d._id === link.deliveryId);
                          return sum + (delivery ? (delivery.price / delivery.quantity) * link.quantity : 0);
                        }, 0) / recharge.quantity) : 0;
                      
                      return (
                        <tr key={recharge._id}>
                          <td>{new Date(recharge.date).toLocaleDateString('fr-FR')}</td>
                          <td>{recharge.quantity}</td>
                          <td>{recharge.totalAmount?.toFixed(2)}€</td>
                          <td>{avgPricePerSac.toFixed(2)}€</td>
                          <td>
                            <Link to={`/edit-recharge/${recharge._id}`} className="btn btn-sm btn-outline-primary mr-1">
                              <FontAwesomeIcon icon={faEdit} />
                            </Link>
                            <button 
                              onClick={() => handleDeleteRecharge(recharge._id)}
                              className="btn btn-sm btn-outline-danger"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Graphique des Liens */}
      {viewMode === 'graph' && (
        <div className="graph-view">
          <h3>🔗 Liens Livraisons ↔ Chargements</h3>
          
          {/* Timeline unifiée intercalée */}
          <div className="unified-timeline">
            {(() => {
              // Créer une timeline unifiée avec livraisons et chargements
              const unifiedEvents = [];
              
              // Ajouter les livraisons
              deliveries.forEach(delivery => {
                const deliveryDate = new Date(delivery.date);
                // Normaliser la date au début de la journée pour éviter les problèmes d'heures
                const normalizedDate = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
                
                unifiedEvents.push({
                  ...delivery,
                  type: 'delivery',
                  date: deliveryDate, // Date originale pour l'affichage
                  normalizedDate: normalizedDate, // Date normalisée pour le tri
                  dayString: normalizedDate.toISOString().split('T')[0] // YYYY-MM-DD
                });
              });
              
              // Ajouter les chargements
              recharges.forEach(recharge => {
                const rechargeDate = new Date(recharge.date);
                // Normaliser la date au début de la journée
                const normalizedDate = new Date(rechargeDate.getFullYear(), rechargeDate.getMonth(), rechargeDate.getDate());
                
                unifiedEvents.push({
                  ...recharge,
                  type: 'recharge',
                  date: rechargeDate, // Date originale pour l'affichage
                  normalizedDate: normalizedDate, // Date normalisée pour le tri
                  dayString: normalizedDate.toISOString().split('T')[0] // YYYY-MM-DD
                });
              });
              
              // Tri: dates décroissantes (plus récent d'abord), puis delivery avant recharge le même jour
              unifiedEvents.sort((a, b) => {
                // Comparer les chaînes de jour normalisées (chronologique décroissant)
                if (a.dayString !== b.dayString) {
                  return b.dayString.localeCompare(a.dayString); // Inversé pour décroissant
                }
                
                // Même jour: chargement (recharge) AVANT livraison (delivery) en tri décroissant
                if (a.type !== b.type) {
                  return a.type === 'recharge' ? -1 : 1;
                }
                
                return 0;
              });
              
              return unifiedEvents.map((event, index) => {
                if (event.type === 'delivery') {
                  return (
                    <div key={`delivery-${event._id}`} className="delivery-card">
                      <div className="delivery-header">
                        <div className="delivery-info">
                          <h4>📦 Livraison du {event.date.toLocaleDateString('fr-FR')}</h4>
                          <div className="delivery-stats">
                            <span className="quantity">{event.quantity} sacs</span>
                            <span className="price">{(event.price / event.quantity).toFixed(2)}€/sac</span>
                            <span className="total">{event.price.toFixed(2)}€ total</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="delivery-detail">
                        <div className="stock-info">
                          <div className="stock-visual">
                            <div className="stock-bar-large">
                              <div 
                                className="stock-used-large" 
                                style={{ 
                                  width: `${((event.quantity - event.remainingQuantity) / event.quantity) * 100}%` 
                                }}
                              ></div>
                            </div>
                            <div className="stock-numbers">
                              <span className="used">{event.quantity - event.remainingQuantity} utilisés</span>
                              <span className="remaining">{event.remainingQuantity} restants</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else { // recharge
                  const links = calculateLinks(event);
                  return (
                    <div key={`recharge-${event._id}`} className="recharge-card">
                      <div className="recharge-header">
                        <div className="recharge-info">
                          <h4>🔥 Chargement du {event.date.toLocaleDateString('fr-FR')}</h4>
                          <div className="recharge-stats">
                            <span className="quantity">{event.quantity} sacs</span>
                            <span className="price">{links.length > 0 ? 
                              (links.reduce((sum, link) => {
                                const delivery = deliveries.find(d => d._id === link.deliveryId);
                                return sum + (delivery ? (delivery.price / delivery.quantity) * link.quantity : 0);
                              }, 0) / event.quantity).toFixed(2) : '0.00'
                            }€/sac</span>
                            <span className="total">{event.totalAmount?.toFixed(2) || '0.00'}€ total</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="connections-detail">
                        <h5>📦 Provenance des pellets:</h5>
                        <div className="connection-flows">
                          {links.map((link, linkIndex) => {
                            const delivery = deliveries.find(d => d._id === link.deliveryId);
                            if (!delivery) return null;
                            
                            return (
                              <div key={linkIndex} className="flow-item">
                                <div className="flow-visual">
                                  <div className="delivery-point">
                                    <span className="date">{new Date(delivery.date).toLocaleDateString('fr-FR')}</span>
                                    <span className="price">{(delivery.price / delivery.quantity).toFixed(2)}€/sac</span>
                                  </div>
                                  <div className="flow-arrow">
                                    <div className="arrow-line"></div>
                                    <div className="arrow-head">▶</div>
                                    <div className="flow-quantity">{link.quantity} sacs</div>
                                  </div>
                                  <div className="percentage-bar">
                                    <div 
                                      className="percentage-fill" 
                                      style={{ width: `${link.percentage}%` }}
                                    ></div>
                                    <span className="percentage-text">{link.percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Résumé du chargement */}
                        <div className="recharge-summary">
                          <div className="summary-item">
                            <strong>Sources utilisées:</strong> {links.length} livraison(s)
                          </div>
                          <div className="summary-item">
                            <strong>Prix moyen:</strong> {links.length > 0 ? 
                              (links.reduce((sum, link) => {
                                const delivery = deliveries.find(d => d._id === link.deliveryId);
                                return sum + (delivery ? (delivery.price / delivery.quantity) * link.quantity : 0);
                              }, 0) / event.quantity).toFixed(2) : '0.00'
                            }€/sac
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              });
            })()}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="spinner-border" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager;