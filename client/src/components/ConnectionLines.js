import React from 'react';

const ConnectionLines = ({ deliveries, recharges, containerHeight }) => {
  // Calculer les liens entre chargements et livraisons avec simulation historique
  const calculateLinks = () => {
    const links = [];
    
    // Créer une copie des livraisons avec stock disponible complet
    const deliveriesStock = deliveries.map((delivery, index) => ({
      ...delivery,
      originalIndex: index,
      availableStock: delivery.quantity,
      date: new Date(delivery.date)
    })).sort((a, b) => a.date - b.date); // Trier par date croissante (FIFO)
    
    // Trier les chargements par date pour les traiter chronologiquement
    const sortedRecharges = recharges
      .map((recharge, index) => ({ 
        ...recharge, 
        originalIndex: index,
        date: new Date(recharge.date) 
      }))
      .sort((a, b) => a.date - b.date);
    
    // Traiter chaque chargement dans l'ordre chronologique
    sortedRecharges.forEach(recharge => {
      let remainingQuantity = recharge.quantity;
      
      // Consommer depuis les livraisons disponibles (FIFO)
      for (const delivery of deliveriesStock) {
        if (remainingQuantity <= 0) break;
        if (delivery.availableStock > 0) {
          const usedQuantity = Math.min(delivery.availableStock, remainingQuantity);
          const percentage = (usedQuantity / recharge.quantity) * 100;
          
          links.push({
            deliveryIndex: delivery.originalIndex,
            rechargeIndex: recharge.originalIndex,
            quantity: usedQuantity,
            percentage,
            deliveryId: delivery._id,
            rechargeId: recharge._id,
            deliveryDate: delivery.date,
            rechargeDate: recharge.date
          });
          
          // Réduire le stock disponible de cette livraison
          delivery.availableStock -= usedQuantity;
          remainingQuantity -= usedQuantity;
        }
      }
    });
    
    return links;
  };

  const links = calculateLinks();
  
  // Calculer les positions approximatives des nœuds
  const nodeHeight = 140; // Hauteur approximative d'un nœud
  const spacing = 15; // Espacement entre les nœuds
  
  return (
    <svg 
      width="200" 
      height={containerHeight || 600} 
      className="connection-lines"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <defs>
        {/* Définir des gradients pour les différents types de connexions */}
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#28a745" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#dc3545" stopOpacity="0.8" />
        </linearGradient>
        
        {/* Flèche pour indiquer la direction */}
        <marker 
          id="arrowhead" 
          markerWidth="10" 
          markerHeight="7" 
          refX="9" 
          refY="3.5" 
          orient="auto"
        >
          <polygon 
            points="0 0, 10 3.5, 0 7" 
            fill="#495057" 
            opacity="0.7"
          />
        </marker>
      </defs>
      
      {links.map((link, index) => {
        // Calculer la position Y des nœuds
        const deliveryY = 60 + (link.deliveryIndex * (nodeHeight + spacing)) + (nodeHeight / 2);
        const rechargeY = 60 + (link.rechargeIndex * (nodeHeight + spacing)) + (nodeHeight / 2);
        
        // Points de la courbe de Bézier
        const startX = 10;
        const endX = 190;
        const controlX1 = 70;
        const controlX2 = 130;
        
        // Couleur basée sur le pourcentage
        const opacity = Math.max(0.3, link.percentage / 100);
        const strokeWidth = Math.max(2, (link.percentage / 100) * 6);
        
        return (
          <g key={`${link.deliveryId}-${link.rechargeId}-${index}`}>
            {/* Ligne de connexion courbe */}
            <path
              d={`M ${startX} ${deliveryY} C ${controlX1} ${deliveryY}, ${controlX2} ${rechargeY}, ${endX} ${rechargeY}`}
              stroke="url(#connectionGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              opacity={opacity}
              markerEnd="url(#arrowhead)"
              className="connection-path"
            />
            
            {/* Étiquette avec la quantité */}
            <g transform={`translate(${(startX + endX) / 2}, ${(deliveryY + rechargeY) / 2})`}>
              <rect
                x="-15"
                y="-8"
                width="30"
                height="16"
                fill="white"
                stroke="#dee2e6"
                rx="8"
                opacity="0.9"
              />
              <text
                textAnchor="middle"
                dy="4"
                fontSize="10"
                fill="#495057"
                fontWeight="bold"
              >
                {link.quantity}
              </text>
            </g>
          </g>
        );
      })}
      
      {/* Légende */}
      <g transform="translate(10, 20)">
        <rect
          width="180"
          height="30"
          fill="white"
          stroke="#dee2e6"
          rx="6"
          opacity="0.95"
        />
        <text x="90" y="15" textAnchor="middle" fontSize="10" fill="#495057" fontWeight="bold">
          📦 Livraisons → 🔥 Chargements
        </text>
        <text x="90" y="25" textAnchor="middle" fontSize="8" fill="#6c757d">
          Épaisseur = proportion utilisée
        </text>
      </g>
    </svg>
  );
};

export default ConnectionLines;