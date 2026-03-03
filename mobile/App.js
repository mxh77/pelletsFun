import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'https://pelletsfun.harmonixe.fr';

export default function App() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/boiler/stats`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const renderStat = (label, value, unit = '') => (
    <View style={styles.statRow} key={label}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value !== null && value !== undefined ? `${value}${unit}` : 'N/A'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔥 PelletsFun</Text>
        <Text style={styles.headerSubtitle}>Gestion chaudière à pellets</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e67e22" />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>Impossible de se connecter au serveur</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {stats && !loading && (
          <>
            {stats.config && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚙️ Configuration</Text>
                {renderStat('Puissance', stats.config.power, ' kW')}
                {renderStat('Consommation journalière', stats.config.dailyConsumption, ' kg')}
                {renderStat('Capacité du silo', stats.config.siloCapacity, ' kg')}
              </View>
            )}

            {stats.summary && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Statistiques</Text>
                {renderStat('Total fichiers importés', stats.summary.totalFiles)}
                {renderStat('Total enregistrements', stats.summary.totalRecords)}
                {renderStat(
                  'Période couverte',
                  stats.summary.dateRange
                    ? `${stats.summary.dateRange.start} → ${stats.summary.dateRange.end}`
                    : null
                )}
              </View>
            )}

            {stats.recentImports && stats.recentImports.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Imports récents</Text>
                {stats.recentImports.slice(0, 5).map((imp, idx) => (
                  <View key={idx} style={styles.importRow}>
                    <Text style={styles.importDate}>{imp.filename}</Text>
                    <Text style={styles.importCount}>{imp.recordCount} enreg.</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>PelletsFun v1.0 • harmonixe.fr</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2a3a',
  },
  header: {
    backgroundColor: '#1a5276',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aed6f1',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#aed6f1',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorDetail: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#e67e22',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1e3a4f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2c4d63',
  },
  statLabel: {
    color: '#aed6f1',
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  importRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2c4d63',
  },
  importDate: {
    color: '#aed6f1',
    fontSize: 13,
    flex: 1,
  },
  importCount: {
    color: '#2ecc71',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    color: '#555',
    fontSize: 12,
  },
});
