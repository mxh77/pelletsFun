import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons';

const RechargeForm = () => {
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newRecharge = { date, quantity };
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/recharges`, newRecharge);
      setDate('');
      setQuantity('');
      setError(''); // Clear any previous error
      navigate('/'); // Rediriger vers la page de la liste des rechargements
    } catch (error) {
      console.error('There was an error creating the recharge!', error);
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
        <h2 className="mb-3">Nouveau Chargement</h2>
        {error && <div className="alert alert-danger">{error}</div>} {/* Display error message */}
        <div className="form-row align-items-center">
          <div className="form-row align-items-center">
            <div className="col-auto">
              <input type="date" className="form-control mb-2" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="col-auto">
              <input type="number" className="form-control mb-2" id="quantity" placeholder="Quantité" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
          </div>
          <div className="flex-container form-row align-items-center justify-content-between">
            <span className="col-auto">
              <Link to="/" className="btn btn-primary mb-2 btn-icon">
                <FontAwesomeIcon icon={faArrowLeft} />
              </Link>
            </span>
            <span className="col-auto">
              <button type="submit" className="btn btn-success mb-2 btn-icon">
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RechargeForm;