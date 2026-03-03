package fr.harmonixe.pelletsfun.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * HomeViewModel
 *
 * Gère les données du tableau de bord (Dashboard).
 * Récupère les livraisons et recharges depuis l'API REST et calcule
 * les statistiques affichées sur la page d'accueil.
 */
class HomeViewModel : ViewModel() {

    // ──────────────────────────────────────────────────────────
    // LiveData exposées au Fragment
    // ──────────────────────────────────────────────────────────

    /** Stock actuel en sacs */
    private val _currentStock = MutableLiveData<Int>()
    val currentStock: LiveData<Int> = _currentStock

    /** Total des sacs livrés */
    private val _totalDeliveries = MutableLiveData<Int>()
    val totalDeliveries: LiveData<Int> = _totalDeliveries

    /** Total des sacs consommés */
    private val _totalRecharges = MutableLiveData<Int>()
    val totalRecharges: LiveData<Int> = _totalRecharges

    /** Dépense totale en euros */
    private val _totalSpent = MutableLiveData<Double>()
    val totalSpent: LiveData<Double> = _totalSpent

    /** Prix moyen par sac */
    private val _averagePrice = MutableLiveData<Double>()
    val averagePrice: LiveData<Double> = _averagePrice

    /** Consommation mensuelle moyenne en sacs */
    private val _monthlyConsumption = MutableLiveData<Double>()
    val monthlyConsumption: LiveData<Double> = _monthlyConsumption

    /** Date de la dernière livraison (formatée) */
    private val _lastDeliveryDate = MutableLiveData<String>()
    val lastDeliveryDate: LiveData<String> = _lastDeliveryDate

    /** Date du dernier chargement (formatée) */
    private val _lastRechargeDate = MutableLiveData<String>()
    val lastRechargeDate: LiveData<String> = _lastRechargeDate

    /** Liste des 6 derniers mois de consommation */
    private val _consumptionByMonth = MutableLiveData<List<MonthlyConsumption>>()
    val consumptionByMonth: LiveData<List<MonthlyConsumption>> = _consumptionByMonth

    /** État de chargement */
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    /** Message d'erreur éventuel */
    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    // ──────────────────────────────────────────────────────────
    // Modèles de données
    // ──────────────────────────────────────────────────────────

    data class MonthlyConsumption(
        val monthLabel: String,   // Ex. "janv. 25"
        val quantity: Int,
        val percentage: Float     // 0..100 par rapport au mois maximum
    )

    // ──────────────────────────────────────────────────────────
    // Chargement des données
    // ──────────────────────────────────────────────────────────

    private val baseUrl = BuildConfig.API_BASE_URL
    private val frenchDateFormat  = SimpleDateFormat("d MMMM yyyy",              Locale.FRENCH)
    private val monthFormat       = SimpleDateFormat("yyyy-MM",                   Locale.FRENCH)
    private val monthLabelFmt     = SimpleDateFormat("MMM yy",                    Locale.FRENCH)
    private val isoDateFull       = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
    private val isoDateShort      = SimpleDateFormat("yyyy-MM-dd",               Locale.getDefault())

    init {
        loadDashboard()
    }

    /** Recharge toutes les données du tableau de bord */
    fun loadDashboard() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val deliveries = fetchJson("$baseUrl/api/deliveries")
                val recharges  = fetchJson("$baseUrl/api/recharges")

                computeStats(deliveries, recharges)
            } catch (e: Exception) {
                _errorMessage.value = "Impossible de charger les données : ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // Calculs statistiques
    // ──────────────────────────────────────────────────────────

    private fun computeStats(deliveries: JSONArray, recharges: JSONArray) {

        // ── Livraisons ──────────────────────────────────────
        var totalDelivered = 0
        var totalStock     = 0
        var totalSpent     = 0.0
        var lastDelivery   = 0L

        for (i in 0 until deliveries.length()) {
            val d = deliveries.getJSONObject(i)
            totalDelivered += d.optInt("quantity", 0)
            totalStock     += d.optInt("remainingQuantity", 0)
            totalSpent     += d.optDouble("price", 0.0)

            val dateMs = parseDate(d.optString("date"))
            if (dateMs > lastDelivery) lastDelivery = dateMs
        }

        val averagePrice = if (deliveries.length() > 0) {
            var sum = 0.0
            for (i in 0 until deliveries.length()) {
                val d = deliveries.getJSONObject(i)
                val qty = d.optDouble("quantity", 1.0)
                if (qty > 0) sum += d.optDouble("price", 0.0) / qty
            }
            sum / deliveries.length()
        } else 0.0

        // ── Recharges ────────────────────────────────────────
        var totalRecharged = 0
        var lastRecharge   = 0L
        val monthMap = mutableMapOf<String, Int>()

        for (i in 0 until recharges.length()) {
            val r = recharges.getJSONObject(i)
            val qty = r.optInt("quantity", 0)
            totalRecharged += qty

            val dateMs = parseDate(r.optString("date"))
            if (dateMs > lastRecharge) lastRecharge = dateMs

            val monthKey = monthFormat.format(Date(dateMs))
            monthMap[monthKey] = (monthMap[monthKey] ?: 0) + qty
        }

        val avgMonthly = if (monthMap.isNotEmpty())
            monthMap.values.sum().toDouble() / monthMap.size
        else 0.0

        // ── Top 6 mois ───────────────────────────────────────
        val sortedMonths = monthMap.entries
            .sortedByDescending { it.key }
            .take(6)

        val maxQty = sortedMonths.maxOfOrNull { it.value }?.toFloat() ?: 1f

        val consumption = sortedMonths.map { (key, qty) ->
            val date = SimpleDateFormat("yyyy-MM", Locale.FRENCH).parse(key) ?: Date()
            MonthlyConsumption(
                monthLabel  = monthLabelFmt.format(date).replaceFirstChar { it.uppercase() },
                quantity    = qty,
                percentage  = (qty / maxQty) * 100f
            )
        }

        // ── Publication ───────────────────────────────────────
        _currentStock.postValue(totalStock)
        _totalDeliveries.postValue(totalDelivered)
        _totalRecharges.postValue(totalRecharged)
        _totalSpent.postValue(totalSpent)
        _averagePrice.postValue(averagePrice)
        _monthlyConsumption.postValue(avgMonthly)
        _lastDeliveryDate.postValue(if (lastDelivery > 0) frenchDateFormat.format(Date(lastDelivery)) else null)
        _lastRechargeDate.postValue(if (lastRecharge > 0) frenchDateFormat.format(Date(lastRecharge)) else null)
        _consumptionByMonth.postValue(consumption)
    }

    // ──────────────────────────────────────────────────────────
    // Utilitaires
    // ──────────────────────────────────────────────────────────

    /** Appel HTTP GET avec dispatcher IO (non bloquant) */
    private suspend fun fetchJson(urlStr: String): JSONArray = withContext(Dispatchers.IO) {
        val text = URL(urlStr).readText()
        JSONArray(text)
    }

    /** Parse une date ISO 8601 et renvoie les milliseconds */
    private fun parseDate(str: String): Long {
        return try {
            isoDateFull.parse(str)?.time ?: 0L
        } catch (_: Exception) {
            try {
                isoDateShort.parse(str)?.time ?: 0L
            } catch (_: Exception) { 0L }
        }
    }
}
