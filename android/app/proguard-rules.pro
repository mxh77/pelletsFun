# Règles ProGuard pour PelletsFun
# Fichier de configuration des règles de minification

# Conserver les classes Android standard
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Règles par défaut pour les bibliothèques AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Material Design
-keep class com.google.android.material.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.Metadata { *; }
