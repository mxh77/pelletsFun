import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPlus, faSync, faEdit } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

const RechargeList = () => {
  const [recharges, setRecharges] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRecharges = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/recharges`);
        setRecharges(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Erreur lors du chargement des recharges:', error);
        setRecharges([]);
      }
    };
    fetchRecharges();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/recharges/${id}`);
      setRecharges(recharges.filter(recharge => recharge._id !== id));
    } catch (error) {
      console.error('There was an error deleting the recharge!', error);
    }
  };

  const handleRecalculateAmounts = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/recharges/recalculate-amounts`);
      setMessage(response.data.message);
      const updatedRecharges = await axios.get(`${process.env.REACT_APP_API_URL}/api/recharges`);
      setRecharges(Array.isArray(updatedRecharges.data) ? updatedRecharges.data : []);
    } catch (error) {
      console.error('There was an error recalculating the amounts!', error);
      setMessage('Error recalculating amounts');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Chargements</h2>
        <div>
          <Link to="/add-recharge" className="btn btn-success mr-2">
            <FontAwesomeIcon icon={faPlus} /> Ajouter Chargement
          </Link>
          <button className="btn btn-primary" onClick={handleRecalculateAmounts}>
            <FontAwesomeIcon icon={faSync} /> Recalculate Amounts
          </button>
        </div>
      </div>
      {message && <div className="alert alert-info">{message}</div>}
      <ul className="list-group">
        {recharges.map((recharge) => (
          <li key={recharge._id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>
              {new Date(recharge.date).toLocaleDateString('fr-FR')} - {recharge.quantity} sacs - {recharge.totalAmount.toFixed(2)} € ({recharge.details})
            </span>
            <div>
              <Link to={`/edit-recharge/${recharge._id}`} className="btn btn-warning btn-sm mr-2">
                <FontAwesomeIcon icon={faEdit} />
              </Link>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(recharge._id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RechargeList;