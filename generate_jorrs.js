const fs = require('fs');

const tollId = 'c1000000-0000-0000-0000-000000000001';

let sql = `-- =============================================
-- SEED DATA: JORR-S (TB Simatupang)
-- =============================================

-- INSERT TOLL ROAD
INSERT INTO toll_roads (id, name, region, total_km, condition_good_percentage)
VALUES ('${tollId}', 'JORR-S (TB Simatupang)', 'Jakarta', 15.00, 82.50);

-- INSERT SEGMENTS (Km 0-1 to Km 14-15)
`;

const segments = [];
for(let i=0; i<15; i++) {
  const segId = `c2000000-0000-0000-0000-${String(i+1).padStart(12, '0')}`;
  segments.push(segId);
  sql += `INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('${segId}', '${tollId}', 'Km ${i}-${i+1}');\n`;
}

sql += '\n-- INSERT 100 DAMAGE REPORTS OVER TIME\n';
let insertReports = `INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES \n`;
const reports = [];

// JORR-S TB Simatupang approximate bounds:
// West (Lebak Bulus): -6.2915, 106.7750
// East (Pasar Rebo/Kp Rambutan): -6.3025, 106.8830
const startLat = -6.2915, startLng = 106.7750;
const endLat = -6.3025, endLng = 106.8830;

const types = ['Retak Memanjang','Retak Melintang','Retak Buaya','Lubang'];
const severityTypes = ['Ringan', 'Ringan', 'Sedang', 'Sedang', 'Parah']; // Slightly weighted
const quarters = ['2023-Q3', '2023-Q4', '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];

for(let i=0; i<100; i++) {
  // t goes from 0 to 1 representing distance along the road
  const t = Math.random();
  
  // Add slight random noise to lat/lng so they aren't on a perfect straight line
  const lat = startLat + t * (endLat - startLat) + (Math.random()-0.5)*0.0003;
  const lng = startLng + t * (endLng - startLng) + (Math.random()-0.5)*0.0003;
  
  const segmentIdx = Math.max(0, Math.min(14, Math.floor(t * 15)));
  const segId = segments[segmentIdx];
  
  const type = types[Math.floor(Math.random()*types.length)];
  const sev = severityTypes[Math.floor(Math.random()*severityTypes.length)];
  const q = quarters[Math.floor(Math.random()*quarters.length)];
  const conf = (80 + Math.random()*18).toFixed(2);
  const dist = (Math.random()*1000).toFixed(2);
  
  const imgUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600';
  
  reports.push(`  ('${segId}', '${type}', '${sev}', ${lat.toFixed(5)}, ${lng.toFixed(5)}, ${dist}, '${q}', '${imgUrl}', ${conf})`);
}

sql += insertReports + reports.join(',\n') + ';\n';

fs.writeFileSync('seed_jorrs.sql', sql);
console.log('✅ Generated 100 dummy damage reports for JORR-S TB Simatupang in seed_jorrs.sql');
