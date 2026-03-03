# Règles ProGuard pour PelletsFun
# Fichier de configuration des règles de minification

# Conserver les annotations et informations de debug
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable

# Kotlin Metadata (nécessaire pour la réflexion Kotlin)
-keepclassmembers class kotlin.Metadata { *; }
