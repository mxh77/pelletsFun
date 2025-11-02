import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Form, Button, Table, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSnowflake, 
  faPlay, 
  faStop, 
  faTrash, 
  faEdit,
  faPlus,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import './SeasonManager.css';

const SeasonManager = () => {
  const [seasons, setSeasons] = useState([]);
  const [seasonsWithStats, setSeasonsWithStats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
    notes: ''
  });

  useEffect(() => {
    fetchSeasons();
    fetchSeasonsWithStats();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/seasons`);
      setSeasons(response.data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchSeasonsWithStats = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/seasons/stats`);
      setSeasonsWithStats(response.data);
    } catch (error) {
      console.error('Error fetching season stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${process.env.REACT_APP_API_URL}/seasons/${editingId}`, formData);
        setMessage('Saison mise à jour avec succès');
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/seasons`, formData);
        setMessage('Saison créée avec succès');
      }
      resetForm();
      fetchSeasons();
      fetchSeasonsWithStats();
    } catch (error) {
      setMessage('Erreur: ' + error.message);
    }
  };

  const handleEdit = (season) => {
    setFormData({
      name: season.name,
      startDate: new Date(season.startDate).toISOString().split('T')[0],
      endDate: new Date(season.endDate).toISOString().split('T')[0],
      isActive: season.isActive,
      notes: season.notes || ''
    });
    setEditingId(season._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette saison ?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/seasons/${id}`);
        setMessage('Saison supprimée');
        fetchSeasons();
        fetchSeasonsWithStats();
      } catch (error) {
        setMessage('Erreur: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      isActive: false,
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="season-manager">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FontAwesomeIcon icon={faSnowflake} className="me-2" />
          Saisons de Chauffage
        </h2>
        <Button 
          variant="success" 
          onClick={() => setShowForm(!showForm)}
        >
          <FontAwesomeIcon icon={showForm ? faCheck : faPlus} className="me-2" />
          {showForm ? 'Annuler' : 'Nouvelle Saison'}
        </Button>
      </div>

      {message && (
        <Alert variant="info" dismissible onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {showForm && (
        <Card className="mb-4 form-card">
          <Card.Body>
            <h5>{editingId ? 'Modifier la Saison' : 'Nouvelle Saison'}</h5>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Nom de la saison</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Hiver 2024-2025"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date de démarrage</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date d'arrêt</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Notes optionnelles..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="isActive"
                  label="Saison active (en cours)"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <div className="d-flex gap-2">
                <Button variant="primary" type="submit">
                  {editingId ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0">Historique des Saisons</h5>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Saison</th>
                <th>Période</th>
                <th>Durée</th>
                <th>Consommation</th>
                <th>Moyenne/jour</th>
                <th>Coût</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasonsWithStats.map((season) => (
                <tr key={season._id}>
                  <td>
                    <strong>{season.name}</strong>
                    {season.notes && (
                      <div className="text-muted small">{season.notes}</div>
                    )}
                  </td>
                  <td>
                    <div className="small">
                      <FontAwesomeIcon icon={faPlay} className="text-success me-1" />
                      {formatDate(season.startDate)}
                    </div>
                    <div className="small">
                      <FontAwesomeIcon icon={faStop} className="text-danger me-1" />
                      {formatDate(season.endDate)}
                    </div>
                  </td>
                  <td>{season.stats?.durationDays} jours</td>
                  <td>
                    <strong>{season.stats?.totalQuantity || 0}</strong> sacs
                    <div className="text-muted small">
                      {season.stats?.rechargesCount || 0} chargements
                    </div>
                  </td>
                  <td>{season.stats?.averagePerDay || 0} sacs/j</td>
                  <td>{season.stats?.totalAmount?.toFixed(2) || 0} €</td>
                  <td>
                    {season.isActive ? (
                      <Badge bg="success">Active</Badge>
                    ) : (
                      <Badge bg="secondary">Terminée</Badge>
                    )}
                  </td>
                  <td>
                    <Button
                      variant="warning"
                      size="sm"
                      className="me-2"
                      onClick={() => handleEdit(season)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(season._id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
              {seasonsWithStats.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    Aucune saison enregistrée
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default SeasonManager;
