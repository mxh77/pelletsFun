package fr.harmonixe.pelletsfun.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import fr.harmonixe.pelletsfun.R
import fr.harmonixe.pelletsfun.databinding.FragmentHomeBinding
import java.text.NumberFormat
import java.util.Locale
import java.util.Calendar

/**
 * HomeFragment
 *
 * Fragment de la page d'accueil (tableau de bord).
 * Observe le HomeViewModel et met à jour l'interface.
 */
class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private val viewModel: HomeViewModel by viewModels()

    // ──────────────────────────────────────────────────────────
    // Cycle de vie
    // ──────────────────────────────────────────────────────────

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupGreeting()
        setupObservers()
        setupActions()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    // ──────────────────────────────────────────────────────────
    // Initialisation
    // ──────────────────────────────────────────────────────────

    /** Affiche un message de salutation selon l'heure */
    private fun setupGreeting() {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val greeting = when {
            hour < 12 -> "Bonjour ! ☀️"
            hour < 18 -> "Bon après-midi ! 🌤️"
            else      -> "Bonsoir ! 🌙"
        }
        binding.tvGreeting.text = greeting
    }

    /** Branche les LiveData du ViewModel sur les vues */
    private fun setupObservers() {

        // Chargement
        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.progressLoading.visibility = if (loading) View.VISIBLE else View.GONE
        }

        // Erreur
        viewModel.errorMessage.observe(viewLifecycleOwner) { msg ->
            if (!msg.isNullOrBlank()) {
                Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
            }
        }

        // Stock actuel
        viewModel.currentStock.observe(viewLifecycleOwner) { stock ->
            binding.tvStockValue.text = stock.toString()
            updateStockStatus(stock)
        }

        // Livraisons totales
        viewModel.totalDeliveries.observe(viewLifecycleOwner) { total ->
            binding.tvDeliveryValue.text = total.toString()
        }

        // Consommation totale
        viewModel.totalRecharges.observe(viewLifecycleOwner) { total ->
            binding.tvConsumptionValue.text = total.toString()
        }

        // Dépenses
        viewModel.totalSpent.observe(viewLifecycleOwner) { amount ->
            binding.tvPriceValue.text = formatEuros(amount)
        }

        viewModel.averagePrice.observe(viewLifecycleOwner) { avg ->
            binding.tvPriceAvg.text = "${String.format(Locale.FRENCH, "%.2f", avg)}€/sac"
        }

        // Dernières activités
        viewModel.lastDeliveryDate.observe(viewLifecycleOwner) { date ->
            binding.tvLastDelivery.text = date ?: getString(R.string.value_none)
        }

        viewModel.lastRechargeDate.observe(viewLifecycleOwner) { date ->
            binding.tvLastRecharge.text = date ?: getString(R.string.value_none)
        }

        viewModel.monthlyConsumption.observe(viewLifecycleOwner) { avg ->
            binding.tvMonthlyAvg.text =
                "${String.format(Locale.FRENCH, "%.1f", avg)} ${getString(R.string.value_bags_per_month)}"
        }

        // Consommation par mois
        viewModel.consumptionByMonth.observe(viewLifecycleOwner) { months ->
            updateMonthlyBars(months)
        }
    }

    /** Configure les boutons d'action rapide */
    private fun setupActions() {
        binding.btnAddDelivery.setOnClickListener {
            // TODO: naviguer vers AddDeliveryFragment
            Toast.makeText(requireContext(), "➕ Ajouter une livraison", Toast.LENGTH_SHORT).show()
        }

        binding.btnAddRecharge.setOnClickListener {
            // TODO: naviguer vers AddRechargeFragment
            Toast.makeText(requireContext(), "🔥 Enregistrer un chargement", Toast.LENGTH_SHORT).show()
        }

        binding.btnViewBoiler.setOnClickListener {
            // TODO: naviguer vers BoilerFragment
            Toast.makeText(requireContext(), "🌡️ Données chaudière", Toast.LENGTH_SHORT).show()
        }

        binding.btnManageSeasons.setOnClickListener {
            // TODO: naviguer vers SeasonsFragment
            Toast.makeText(requireContext(), "❄️ Gérer les saisons", Toast.LENGTH_SHORT).show()
        }
    }

    // ──────────────────────────────────────────────────────────
    // Mises à jour dynamiques de l'UI
    // ──────────────────────────────────────────────────────────

    /** Met à jour le badge de statut du stock selon la quantité */
    private fun updateStockStatus(stock: Int) {
        val (label, colorRes) = when {
            stock > 50 -> Pair(getString(R.string.status_excellent), R.color.status_excellent)
            stock > 20 -> Pair(getString(R.string.status_good),      R.color.status_good)
            stock > 10 -> Pair(getString(R.string.status_low),       R.color.status_low)
            else       -> Pair(getString(R.string.status_critical),  R.color.status_critical)
        }
        binding.tvStockStatus.text = label
        // La couleur de fond du badge reste semi-transparente blanc (définie en XML),
        // mais on pourrait aussi changer sa couleur ici dynamiquement si nécessaire.
    }

    /**
     * Génère dynamiquement les barres de consommation mensuelle.
     */
    private fun updateMonthlyBars(months: List<HomeViewModel.MonthlyConsumption>) {
        val container = binding.llMonthlyBars
        container.removeAllViews()

        if (months.isEmpty()) {
            binding.tvNoConsumptionData.visibility = View.VISIBLE
            return
        }

        binding.tvNoConsumptionData.visibility = View.GONE

        // Utilise un ViewTreeObserver unique pour calculer les largeurs
        container.viewTreeObserver.addOnGlobalLayoutListener(object :
            android.view.ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                container.viewTreeObserver.removeOnGlobalLayoutListener(this)
                val availableWidth = container.width
                months.forEach { month ->
                    val barFill = container.findViewWithTag<View>("bar_${month.monthLabel}")
                    if (barFill != null) {
                        val fillWidth = ((month.percentage / 100f) * availableWidth)
                            .toInt().coerceAtLeast(4)
                        val params = barFill.layoutParams
                        params.width = fillWidth
                        barFill.layoutParams = params
                    }
                }
            }
        })

        months.forEach { month ->
            val barView = layoutInflater.inflate(R.layout.item_month_bar, container, false)
            barView.findViewById<TextView>(R.id.tv_month_label).text = month.monthLabel
            barView.findViewById<TextView>(R.id.tv_month_value).text = month.quantity.toString()
            barView.findViewById<View>(R.id.bar_fill).tag = "bar_${month.monthLabel}"
            container.addView(barView)
        }
    }

    // ──────────────────────────────────────────────────────────
    // Utilitaires
    // ──────────────────────────────────────────────────────────

    /** Formate un montant en euros (ex. 2 610€) */
    private fun formatEuros(amount: Double): String {
        return "${NumberFormat.getNumberInstance(Locale.FRENCH).format(amount.toLong())}€"
    }
}
