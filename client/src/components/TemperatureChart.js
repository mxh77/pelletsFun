import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { fr } from 'date-fns/locale';
import './TemperatureChart.css';

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const TemperatureChart = ({ filename, onClose }) => {
  const [temperatureData, setTemperatureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTemperatureData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/boiler/temperature-data/${filename}`);
      const result = await response.json();
      
      if (result.success) {
        setTemperatureData(result.data);
      } else {
        setError(result.message || 'Erreur lors du chargement des données');
      }
    } catch (error) {
      console.error('Erreur chargement données température:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, [filename]);

  useEffect(() => {
    if (filename) {
      loadTemperatureData();
    }
  }, [filename, loadTemperatureData]);

  const formatChartData = () => {
    if (!temperatureData || !temperatureData.temperatureData) return null;

    const data = temperatureData.temperatureData;
    
    return {
      datasets: [
        {
          label: 'Température Réelle',
          data: data.map(point => ({
            x: point.timestamp,
            y: point.realTemp
          })),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Température de Consigne',
          data: data.map(point => ({
            x: point.timestamp,
            y: point.setpointTemp
          })),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Température Extérieure',
          data: data.map(point => ({
            x: point.timestamp,
            y: point.outdoorTemp
          })),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          fill: false,
          tension: 0.1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: `Évolution des températures - ${filename}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(context) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          },
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}°C`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        adapters: {
          date: {
            locale: fr
          }
        },
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'dd/MM'
          },
          tooltipFormat: 'dd/MM/yyyy HH:mm'
        },
        title: {
          display: true,
          text: 'Heure'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Température (°C)'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    elements: {
      point: {
        hoverBackgroundColor: 'white',
        hoverBorderWidth: 2
      }
    }
  };

  if (loading) {
    return (
      <div className="temperature-chart-modal">
        <div className="temperature-chart-content">
          <div className="temperature-chart-header">
            <h3>Chargement des données...</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Analyse du fichier en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="temperature-chart-modal">
        <div className="temperature-chart-content">
          <div className="temperature-chart-header">
            <h3>Erreur</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={loadTemperatureData} className="retry-button">
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chartData = formatChartData();

  return (
    <div className="temperature-chart-modal" onClick={onClose}>
      <div className="temperature-chart-content" onClick={e => e.stopPropagation()}>
        <div className="temperature-chart-header">
          <h3>📊 Graphique des Températures</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="temperature-stats">
          <div className="stat-card">
            <div className="stat-label">Points de données</div>
            <div className="stat-value">{temperatureData?.totalPoints || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Fichier</div>
            <div className="stat-value">{filename}</div>
          </div>
        </div>

        <div className="chart-container">
          {chartData && <Line data={chartData} options={chartOptions} />}
        </div>
        
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'rgb(54, 162, 235)' }}></div>
            <span>Température Ambiante (sonde)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'rgb(255, 99, 132)' }}></div>
            <span>Température de Consigne</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'rgb(75, 192, 192)' }}></div>
            <span>Température Extérieure</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemperatureChart;