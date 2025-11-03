import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faSync, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const DeliveryList = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/deliveries`);
        setDeliveries(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Erreur lors du chargement des livraisons:', error);
        setDeliveries([]);
      }
    };
    fetchDeliveries();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/deliveries/${id}`);
      setDeliveries(deliveries.filter(delivery => delivery._id !== id));
    } catch (error) {
      console.error('There was an error deleting the delivery!', error);
    }
  };

  const handleRecalculateStock = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/deliveries/recalculate-stock`);
      setMessage(response.data.message);
      const updatedDeliveries = await axios.get(`${process.env.REACT_APP_API_URL}/deliveries`);
      setDeliveries(updatedDeliveries.data);
    } catch (error) {
      console.error('There was an error recalculating the stock!', error);
      setMessage('Error recalculating stock');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Livraisons</h2>
        <div>
          <Link to="/add-delivery" className="btn btn-success mr-2">
            <FontAwesomeIcon icon={faPlus} /> Ajouter Livraison
          </Link>
          <button className="btn btn-primary" onClick={handleRecalculateStock}>
            <FontAwesomeIcon icon={faSync} /> Calculer Stock
          </button>
        </div>
      </div>
      {message && <div className="alert alert-info">{message}</div>}
      <ul className="list-group">
        {deliveries.map((delivery) => {
          const pricePerSac = delivery.price / delivery.quantity;
          return (
            <li key={delivery._id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                {new Date(delivery.date).toLocaleDateString('fr-FR')} - {delivery.quantity} sacs - {delivery.price.toFixed(2)} € - Restant: {delivery.remainingQuantity} - Prix par sac: {pricePerSac.toFixed(2)} €
              </span>
              <div>
                <Link to={`/edit-delivery/${delivery._id}`} className="btn btn-warning btn-sm mr-2">
                  <FontAwesomeIcon icon={faEdit} />
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(delivery._id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DeliveryList;