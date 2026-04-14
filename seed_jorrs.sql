-- =============================================
-- SEED DATA: JORR-S (TB Simatupang)
-- =============================================

-- INSERT TOLL ROAD
INSERT INTO toll_roads (id, name, region, total_km, condition_good_percentage)
VALUES ('c1000000-0000-0000-0000-000000000001', 'JORR-S (TB Simatupang)', 'Jakarta', 15.00, 82.50);

-- INSERT SEGMENTS (Km 0-1 to Km 14-15)
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Km 0-1');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Km 1-2');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Km 2-3');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001', 'Km 3-4');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'Km 4-5');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', 'Km 5-6');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001', 'Km 6-7');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', 'Km 7-8');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000001', 'Km 8-9');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000001', 'Km 9-10');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001', 'Km 10-11');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000001', 'Km 11-12');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000001', 'Km 12-13');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000001', 'Km 13-14');
INSERT INTO road_segments (id, toll_road_id, segment_name) VALUES ('c2000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000001', 'Km 14-15');

-- INSERT 100 DAMAGE REPORTS OVER TIME
INSERT INTO damage_reports (segment_id, damage_type, severity, lat, lng, distance_meter, quarter_period, image_url, ai_confidence) VALUES 
  ('c2000000-0000-0000-0000-000000000007', 'Retak Buaya', 'Sedang', -6.29647, 106.82402, 428.85, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 83.77),
  ('c2000000-0000-0000-0000-000000000006', 'Retak Memanjang', 'Sedang', -6.29523, 106.81151, 601.93, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.82),
  ('c2000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Parah', -6.30210, 106.87817, 952.78, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.86),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Memanjang', 'Ringan', -6.29299, 106.79045, 81.55, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.02),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Sedang', -6.29303, 106.79136, 804.83, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.98),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Memanjang', 'Ringan', -6.29409, 106.79888, 695.51, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.56),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Sedang', -6.29262, 106.78542, 299.42, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.73),
  ('c2000000-0000-0000-0000-000000000006', 'Retak Buaya', 'Sedang', -6.29553, 106.81351, 600.88, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 80.93),
  ('c2000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Sedang', -6.30205, 106.87795, 40.94, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 84.59),
  ('c2000000-0000-0000-0000-000000000005', 'Retak Memanjang', 'Ringan', -6.29477, 106.80701, 608.27, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.75),
  ('c2000000-0000-0000-0000-000000000002', 'Lubang', 'Ringan', -6.29241, 106.78392, 453.59, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.54),
  ('c2000000-0000-0000-0000-000000000001', 'Retak Melintang', 'Parah', -6.29208, 106.78072, 885.96, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.66),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Memanjang', 'Sedang', -6.29394, 106.79914, 249.88, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.64),
  ('c2000000-0000-0000-0000-000000000006', 'Retak Memanjang', 'Ringan', -6.29545, 106.81491, 811.96, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.56),
  ('c2000000-0000-0000-0000-000000000010', 'Retak Buaya', 'Ringan', -6.29843, 106.84241, 185.02, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.01),
  ('c2000000-0000-0000-0000-000000000001', 'Retak Melintang', 'Sedang', -6.29200, 106.78056, 22.55, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.73),
  ('c2000000-0000-0000-0000-000000000011', 'Retak Memanjang', 'Parah', -6.29934, 106.85332, 329.21, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.53),
  ('c2000000-0000-0000-0000-000000000010', 'Retak Melintang', 'Ringan', -6.29865, 106.84554, 668.11, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.78),
  ('c2000000-0000-0000-0000-000000000005', 'Retak Buaya', 'Sedang', -6.29449, 106.80521, 900.03, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.37),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Buaya', 'Parah', -6.29259, 106.78431, 737.61, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.90),
  ('c2000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Ringan', -6.30207, 106.87911, 192.31, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.21),
  ('c2000000-0000-0000-0000-000000000008', 'Lubang', 'Parah', -6.29666, 106.82611, 945.26, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.79),
  ('c2000000-0000-0000-0000-000000000013', 'Retak Memanjang', 'Ringan', -6.30058, 106.86389, 201.12, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.00),
  ('c2000000-0000-0000-0000-000000000007', 'Retak Memanjang', 'Sedang', -6.29599, 106.82023, 961.35, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.73),
  ('c2000000-0000-0000-0000-000000000009', 'Lubang', 'Parah', -6.29763, 106.83399, 797.51, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.80),
  ('c2000000-0000-0000-0000-000000000004', 'Lubang', 'Parah', -6.29445, 106.80338, 602.98, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.95),
  ('c2000000-0000-0000-0000-000000000011', 'Lubang', 'Parah', -6.29950, 106.85288, 216.60, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.41),
  ('c2000000-0000-0000-0000-000000000011', 'Retak Memanjang', 'Sedang', -6.29919, 106.85061, 188.14, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.78),
  ('c2000000-0000-0000-0000-000000000007', 'Lubang', 'Sedang', -6.29602, 106.81838, 36.46, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.28),
  ('c2000000-0000-0000-0000-000000000009', 'Retak Melintang', 'Parah', -6.29759, 106.83562, 564.23, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.81),
  ('c2000000-0000-0000-0000-000000000005', 'Retak Buaya', 'Ringan', -6.29522, 106.81032, 455.84, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 82.78),
  ('c2000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Ringan', -6.29208, 106.78204, 405.24, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.65),
  ('c2000000-0000-0000-0000-000000000009', 'Retak Melintang', 'Ringan', -6.29784, 106.83871, 300.22, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.77),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Memanjang', 'Parah', -6.29401, 106.79875, 907.31, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.53),
  ('c2000000-0000-0000-0000-000000000015', 'Lubang', 'Sedang', -6.30256, 106.88242, 335.76, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.72),
  ('c2000000-0000-0000-0000-000000000009', 'Retak Memanjang', 'Sedang', -6.29783, 106.83680, 407.38, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.70),
  ('c2000000-0000-0000-0000-000000000008', 'Lubang', 'Parah', -6.29694, 106.82977, 205.38, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.49),
  ('c2000000-0000-0000-0000-000000000006', 'Lubang', 'Parah', -6.29533, 106.81301, 678.39, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.08),
  ('c2000000-0000-0000-0000-000000000011', 'Retak Buaya', 'Ringan', -6.29929, 106.85141, 735.28, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.45),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Melintang', 'Sedang', -6.29302, 106.78938, 248.93, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.10),
  ('c2000000-0000-0000-0000-000000000014', 'Retak Melintang', 'Ringan', -6.30136, 106.87265, 700.26, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.10),
  ('c2000000-0000-0000-0000-000000000007', 'Retak Memanjang', 'Parah', -6.29667, 106.82438, 609.23, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.78),
  ('c2000000-0000-0000-0000-000000000005', 'Lubang', 'Parah', -6.29445, 106.80508, 566.95, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.12),
  ('c2000000-0000-0000-0000-000000000010', 'Retak Buaya', 'Sedang', -6.29883, 106.84653, 180.83, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.14),
  ('c2000000-0000-0000-0000-000000000005', 'Retak Memanjang', 'Sedang', -6.29451, 106.80595, 934.04, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.89),
  ('c2000000-0000-0000-0000-000000000005', 'Retak Memanjang', 'Parah', -6.29470, 106.80641, 227.00, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.80),
  ('c2000000-0000-0000-0000-000000000010', 'Lubang', 'Ringan', -6.29857, 106.84568, 521.48, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.89),
  ('c2000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Ringan', -6.29175, 106.77824, 294.38, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.91),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Melintang', 'Ringan', -6.29395, 106.79997, 245.18, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.80),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Melintang', 'Ringan', -6.29353, 106.79532, 411.23, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 80.07),
  ('c2000000-0000-0000-0000-000000000001', 'Retak Buaya', 'Ringan', -6.29170, 106.77717, 363.44, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 83.79),
  ('c2000000-0000-0000-0000-000000000011', 'Retak Memanjang', 'Sedang', -6.29942, 106.85317, 966.92, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 83.49),
  ('c2000000-0000-0000-0000-000000000009', 'Lubang', 'Ringan', -6.29781, 106.83666, 796.41, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.68),
  ('c2000000-0000-0000-0000-000000000002', 'Lubang', 'Sedang', -6.29222, 106.78222, 509.82, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.44),
  ('c2000000-0000-0000-0000-000000000007', 'Retak Memanjang', 'Sedang', -6.29614, 106.82104, 975.15, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 82.81),
  ('c2000000-0000-0000-0000-000000000011', 'Lubang', 'Parah', -6.29915, 106.84956, 281.42, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.00),
  ('c2000000-0000-0000-0000-000000000006', 'Retak Memanjang', 'Ringan', -6.29523, 106.81112, 979.73, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.38),
  ('c2000000-0000-0000-0000-000000000011', 'Lubang', 'Ringan', -6.29909, 106.84976, 68.29, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.95),
  ('c2000000-0000-0000-0000-000000000012', 'Retak Memanjang', 'Sedang', -6.29998, 106.85810, 947.92, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 84.78),
  ('c2000000-0000-0000-0000-000000000005', 'Lubang', 'Sedang', -6.29465, 106.80451, 156.35, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 83.68),
  ('c2000000-0000-0000-0000-000000000006', 'Lubang', 'Ringan', -6.29561, 106.81480, 835.76, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.72),
  ('c2000000-0000-0000-0000-000000000011', 'Lubang', 'Sedang', -6.29926, 106.84976, 486.55, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.31),
  ('c2000000-0000-0000-0000-000000000011', 'Retak Memanjang', 'Sedang', -6.29923, 106.84991, 989.82, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.53),
  ('c2000000-0000-0000-0000-000000000006', 'Lubang', 'Ringan', -6.29556, 106.81631, 323.73, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.98),
  ('c2000000-0000-0000-0000-000000000015', 'Retak Memanjang', 'Ringan', -6.30178, 106.87660, 937.21, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.88),
  ('c2000000-0000-0000-0000-000000000004', 'Lubang', 'Parah', -6.29438, 106.80352, 866.09, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.17),
  ('c2000000-0000-0000-0000-000000000008', 'Retak Memanjang', 'Ringan', -6.29660, 106.82638, 787.00, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.99),
  ('c2000000-0000-0000-0000-000000000001', 'Lubang', 'Sedang', -6.29154, 106.77505, 957.95, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.45),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Buaya', 'Parah', -6.29297, 106.78940, 720.96, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.34),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Sedang', -6.29257, 106.78487, 65.55, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 94.77),
  ('c2000000-0000-0000-0000-000000000013', 'Retak Memanjang', 'Parah', -6.30051, 106.86447, 679.26, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 80.54),
  ('c2000000-0000-0000-0000-000000000014', 'Retak Memanjang', 'Ringan', -6.30116, 106.87019, 732.00, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 87.24),
  ('c2000000-0000-0000-0000-000000000009', 'Lubang', 'Sedang', -6.29743, 106.83266, 690.76, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 80.61),
  ('c2000000-0000-0000-0000-000000000008', 'Retak Memanjang', 'Ringan', -6.29685, 106.82684, 620.04, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 92.91),
  ('c2000000-0000-0000-0000-000000000013', 'Retak Melintang', 'Ringan', -6.30091, 106.86868, 849.16, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.97),
  ('c2000000-0000-0000-0000-000000000005', 'Lubang', 'Sedang', -6.29451, 106.80397, 293.60, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.93),
  ('c2000000-0000-0000-0000-000000000005', 'Lubang', 'Parah', -6.29510, 106.81065, 17.15, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.93),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Buaya', 'Ringan', -6.29445, 106.80361, 363.57, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 81.58),
  ('c2000000-0000-0000-0000-000000000004', 'Retak Melintang', 'Ringan', -6.29426, 106.80336, 424.12, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.52),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Parah', -6.29331, 106.79364, 366.32, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.64),
  ('c2000000-0000-0000-0000-000000000013', 'Retak Buaya', 'Ringan', -6.30067, 106.86509, 582.95, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.94),
  ('c2000000-0000-0000-0000-000000000013', 'Retak Melintang', 'Sedang', -6.30080, 106.86552, 75.57, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.23),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Sedang', -6.29277, 106.78828, 521.89, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 93.30),
  ('c2000000-0000-0000-0000-000000000009', 'Lubang', 'Sedang', -6.29794, 106.83828, 184.87, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.67),
  ('c2000000-0000-0000-0000-000000000009', 'Retak Melintang', 'Ringan', -6.29795, 106.83884, 703.44, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 88.69),
  ('c2000000-0000-0000-0000-000000000001', 'Lubang', 'Ringan', -6.29180, 106.77900, 768.09, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 84.29),
  ('c2000000-0000-0000-0000-000000000007', 'Lubang', 'Sedang', -6.29609, 106.81848, 467.59, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.41),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Ringan', -6.29237, 106.78309, 382.51, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.55),
  ('c2000000-0000-0000-0000-000000000013', 'Lubang', 'Sedang', -6.30080, 106.86666, 533.74, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.41),
  ('c2000000-0000-0000-0000-000000000014', 'Lubang', 'Sedang', -6.30170, 106.87549, 303.98, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 90.80),
  ('c2000000-0000-0000-0000-000000000008', 'Retak Buaya', 'Sedang', -6.29694, 106.82805, 787.90, '2024-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 96.81),
  ('c2000000-0000-0000-0000-000000000014', 'Retak Melintang', 'Sedang', -6.30171, 106.87424, 377.71, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 82.27),
  ('c2000000-0000-0000-0000-000000000009', 'Lubang', 'Ringan', -6.29770, 106.83531, 760.88, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 89.65),
  ('c2000000-0000-0000-0000-000000000015', 'Retak Buaya', 'Ringan', -6.30199, 106.87823, 482.31, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.45),
  ('c2000000-0000-0000-0000-000000000006', 'Lubang', 'Sedang', -6.29560, 106.81478, 676.59, '2024-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 95.76),
  ('c2000000-0000-0000-0000-000000000002', 'Retak Melintang', 'Ringan', -6.29307, 106.78902, 277.41, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 91.29),
  ('c2000000-0000-0000-0000-000000000003', 'Retak Buaya', 'Sedang', -6.29329, 106.79232, 574.86, '2024-Q2', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 82.96),
  ('c2000000-0000-0000-0000-000000000006', 'Lubang', 'Sedang', -6.29563, 106.81664, 818.96, '2024-Q1', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 86.12),
  ('c2000000-0000-0000-0000-000000000005', 'Lubang', 'Sedang', -6.29481, 106.80630, 671.00, '2023-Q4', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 85.43),
  ('c2000000-0000-0000-0000-000000000008', 'Retak Melintang', 'Sedang', -6.29667, 106.82653, 635.14, '2023-Q3', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600', 97.26);
