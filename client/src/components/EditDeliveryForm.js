import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';

const EditDeliveryForm = () => {
  const { id } = useParams();
  const [date, setDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/deliveries/${id}`);
        const delivery = response.data;
        setDate(new Date(delivery.date).toISOString().split('T')[0]); // Convertir la date au format yyyy-MM-dd
        setQuantity(delivery.quantity);
        setPrice(delivery.price);
      } catch (error) {
        console.error('There was an error fetching the delivery!', error);
      }
    };
    fetchDelivery();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedDelivery = { date, quantity: parseInt(quantity, 10), price: parseFloat(price) };
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/deliveries/${id}`, updatedDelivery);
      navigate('/'); // Rediriger vers la page de la liste des livraisons
    } catch (error) {
      console.error('There was an error updating the delivery!', error);
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
        <h2 className="mb-3">Modifier Livraison</h2>
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
          <div className="col-auto">
            <label className="sr-only" htmlFor="price">Prix</label>
            <input type="number" className="form-control mb-2" id="price" placeholder="Prix" value={price} onChange={(e) => setPrice(e.target.value)} required />
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

export default EditDeliveryForm;