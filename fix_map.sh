sed -i '/if (typeof tech.currentLat !== "number" || typeof tech.currentLng !== "number") return;/d' src/components/MapContainer.tsx
sed -i 's/technicians.forEach(tech => {/technicians.forEach(tech => {\n      if (typeof tech.currentLat !== "number" || typeof tech.currentLng !== "number") return;/' src/components/MapContainer.tsx
