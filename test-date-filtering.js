// Test des fonctions de filtrage par date de fichier

// Fonction pour extraire la date d'un nom de fichier
function extractDateFromFilename(filename) {
  const patterns = [
    /touch_(\d{8})\.csv$/i,        // touch_20251102.csv
    /(\d{8})\.csv$/i,              // 20251102.csv
    /(\d{4})(\d{2})(\d{2})/        // YYYYMMDD n'importe où
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      let dateStr;
      if (match.length === 2) {
        dateStr = match[1]; // Format YYYYMMDD complet
      } else if (match.length === 4) {
        dateStr = match[1] + match[2] + match[3]; // YYYY MM DD séparés
      }

      if (dateStr && dateStr.length === 8) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        
        const date = new Date(`${year}-${month}-${day}`);
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }
  return null;
}

// Fonction pour vérifier si une date est dans une plage
function isFileInDateRange(fileDate, dateFrom, dateTo) {
  if (!fileDate) return true;

  const fileDateOnly = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());
  
  if (dateFrom) {
    const fromDateOnly = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate());
    if (fileDateOnly < fromDateOnly) return false;
  }

  if (dateTo) {
    const toDateOnly = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate());
    if (fileDateOnly > toDateOnly) return false;
  }

  return true;
}

// Tests
const testFiles = [
  'touch_20251102.csv',
  'touch_20251103.csv', 
  'touch_20251104.csv',
  'touch_20251105.csv',
  'other_file.csv'
];

const dateFrom = new Date('2025-11-03');
const dateTo = new Date('2025-11-04');

console.log(`\n🧪 Test du filtrage par date de fichier`);
console.log(`📅 Période demandée: ${dateFrom.toISOString().split('T')[0]} au ${dateTo.toISOString().split('T')[0]}`);
console.log(`\n📁 Fichiers testés:`);

testFiles.forEach(filename => {
  const fileDate = extractDateFromFilename(filename);
  const inRange = isFileInDateRange(fileDate, dateFrom, dateTo);
  
  console.log(`  • ${filename}`);
  console.log(`    Date extraite: ${fileDate ? fileDate.toISOString().split('T')[0] : 'Non trouvée'}`);
  console.log(`    Dans la période: ${inRange ? '✅ OUI' : '❌ NON'}`);
  console.log('');
});

console.log(`\n📋 Résumé:`);
console.log(`Dans votre exemple, pour la période 03/11/2025 au 04/11/2025:`);
console.log(`• touch_20251102.csv (02/11) → ❌ Exclu (avant la période)`);
console.log(`• touch_20251103.csv (03/11) → ✅ Inclus`); 
console.log(`• touch_20251104.csv (04/11) → ✅ Inclus`);
console.log(`• touch_20251105.csv (05/11) → ❌ Exclu (après la période)`);