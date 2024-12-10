import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';

const EditRechargeForm = () => {
  const { id } = useParams();
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecharge = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/recharges/${id}`);
        const recharge = response.data;
        setDate(new Date(recharge.date).toISOString().split('T')[0]); // Convertir la date au format yyyy-MM-dd
        setQuantity(recharge.quantity);
      } catch (error) {
        console.error('There was an error fetching the recharge!', error);
      }
    };
    fetchRecharge();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedRecharge = { date, quantity: parseInt(quantity, 10) };
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/recharges/${id}`, updatedRecharge);
      navigate('/'); // Rediriger vers la page de la liste des chargements
    } catch (error) {
      console.error('There was an error updating the recharge!', error);
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error); // Set the error message
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <h2 className="mb-3">Modifier Chargement</h2>
        {error && <div className="alert alert-danger">{error}</div>} {/* Display error message */}
        <div className="form-row align-items-center">
          <div className="col-auto">
            <label className="sr-only" htmlFor="date">Date</label>
            <input type="date" className="form-control mb-2" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="col-auto">
            <label className="sr-only" htmlFor="quantity">Quantité</label>
            <input type="number" className="form-control mb-2" id="quantity" placeholder="Quantité" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>
        <div className="form-row align-items-center justify-content-between">
          <span className="col-auto">
            <Link to="/" className="btn btn-primary mb-2">
              <FontAwesomeIcon icon={faArrowLeft} /> Retour
            </Link>
          </span>
          <span className="col-auto">
            <button type="submit" className="btn btn-success mb-2">
              <FontAwesomeIcon icon={faSave} /> Modifier
            </button>
          </span>
        </div>
      </form>
    </div>
  );
};

export default EditRechargeForm;