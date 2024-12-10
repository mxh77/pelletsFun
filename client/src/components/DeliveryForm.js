import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons';

const DeliveryForm = () => {
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newDelivery = { date, quantity, price };
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/deliveries`, newDelivery);
      setDate('');
      setQuantity('');
      setPrice('');
      navigate('/'); // Rediriger vers la page de la liste des livraisons
    } catch (error) {
      console.error('There was an error creating the delivery!', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-4">
        <h2 className="mb-3">Nouvelle Livraison</h2>
        <div className="form-row align-items-center">
          <div className="form-row align-items-center">
            <div className="col-auto">
              <input type="date" className="form-control mb-2" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="col-auto">
              <input type="number" className="form-control mb-2" id="quantity" placeholder="Quantité" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="col-auto">
              <input type="number" className="form-control mb-2" id="price" placeholder="Prix" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
          </div>
          <div className="flex-container form-row align-items-center space-between">
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

export default DeliveryForm;