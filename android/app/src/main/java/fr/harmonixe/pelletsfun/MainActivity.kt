package fr.harmonixe.pelletsfun

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import fr.harmonixe.pelletsfun.databinding.ActivityMainBinding

/**
 * MainActivity
 *
 * Activité principale de l'application PelletsFun.
 * Gère la navigation entre les fragments via la BottomNavigationView.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Configuration de la Toolbar
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        // Configuration de la navigation
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        // Liaison de la BottomNavigationView avec le NavController
        val bottomNav: BottomNavigationView = binding.bottomNav
        bottomNav.setupWithNavController(navController)

        // Mise à jour du titre de la Toolbar selon le fragment actif
        navController.addOnDestinationChangedListener { _, destination, _ ->
            supportActionBar?.subtitle = when (destination.id) {
                R.id.nav_home     -> null
                R.id.nav_stock    -> getString(R.string.nav_stock)
                R.id.nav_boiler   -> getString(R.string.nav_boiler)
                R.id.nav_history  -> getString(R.string.nav_history)
                else              -> null
            }
        }
    }
}
