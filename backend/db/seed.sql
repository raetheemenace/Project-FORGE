-- FORGE System Sample Data
-- Run this after schema.sql to populate the database with test data

-- Clear existing data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE forge_analytics_daily, forge_maintenance_tickets, forge_admin_actions, 
                forge_equipment_events, forge_scan_log, forge_maintenance, 
                forge_txn_items, forge_transactions, forge_equipment, 
                forge_lab_rooms, forge_users CASCADE;

-- Insert sample users
INSERT INTO forge_users (student_id, username, password_hash, full_name, program, role) VALUES
('2024001', 'juan.cruz', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Juan Dela Cruz', 'BS Computer Engineering', 'STUDENT'),
('2024002', 'maria.santos', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Maria Santos', 'BS Electronics Engineering', 'STUDENT'),
('2024003', 'pedro.reyes', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Pedro Reyes', 'BS Mechanical Engineering', 'STUDENT'),
('2024004', 'ana.garcia', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Ana Garcia', 'BS Civil Engineering', 'STUDENT'),
('2024005', 'jose.lopez', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Jose Lopez', 'BS Computer Engineering', 'STUDENT'),
('ADMIN01', 'admin', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'Lab Administrator', 'Lab Management', 'LAB_ADMIN');

-- Insert lab rooms
INSERT INTO forge_lab_rooms (room_id, room_name, department, capacity, status) VALUES
('A-101', 'Computer Laboratory 1', 'Computer Engineering', 40, 'ACTIVE'),
('A-102', 'Computer Laboratory 2', 'Computer Engineering', 35, 'ACTIVE'),
('B-201', 'Electronics Laboratory', 'Electronics Engineering', 30, 'ACTIVE'),
('B-202', 'Microprocessor Laboratory', 'Electronics Engineering', 25, 'ACTIVE'),
('C-301', 'Mechanical Workshop', 'Mechanical Engineering', 20, 'MAINTENANCE'),
('C-302', 'Thermodynamics Laboratory', 'Mechanical Engineering', 30, 'ACTIVE'),
('D-401', 'Structural Testing Lab', 'Civil Engineering', 25, 'ACTIVE'),
('D-402', 'Materials Laboratory', 'Civil Engineering', 30, 'ACTIVE');

-- Insert equipment (60+ items including common lab equipment for easy identification)
INSERT INTO forge_equipment (equipment_id, name, department, s3_image_key, status) VALUES
-- Computer Engineering Equipment (15 items)
('EQ-1001', 'Oscilloscope Tektronix TDS2024C', 'Computer Engineering', 'equipment/oscilloscope-tek.jpg', 'AVAILABLE'),
('EQ-1002', 'Function Generator Agilent 33220A', 'Computer Engineering', 'equipment/function-gen.jpg', 'AVAILABLE'),
('EQ-1003', 'Digital Multimeter Fluke 87V', 'Computer Engineering', 'equipment/multimeter-fluke.jpg', 'AVAILABLE'),
('EQ-1004', 'Logic Analyzer Saleae Logic Pro 16', 'Computer Engineering', 'equipment/logic-analyzer.jpg', 'AVAILABLE'),
('EQ-1005', 'Soldering Station Hakko FX-888D', 'Computer Engineering', 'equipment/soldering-station.jpg', 'AVAILABLE'),
('EQ-1006', 'Arduino Uno R3 Development Board', 'Computer Engineering', 'equipment/arduino-uno.jpg', 'AVAILABLE'),
('EQ-1007', 'Raspberry Pi 4 Model B 8GB', 'Computer Engineering', 'equipment/raspberry-pi.jpg', 'AVAILABLE'),
('EQ-1008', 'Breadboard 830 Tie Points', 'Computer Engineering', 'equipment/breadboard.jpg', 'AVAILABLE'),
('EQ-1009', 'Wire Stripper Tool', 'Computer Engineering', 'equipment/wire-stripper.jpg', 'AVAILABLE'),
('EQ-1010', 'Digital Caliper 150mm', 'Computer Engineering', 'equipment/digital-caliper.jpg', 'AVAILABLE'),
('EQ-1011', 'Hot Air Rework Station', 'Computer Engineering', 'equipment/hot-air-station.jpg', 'AVAILABLE'),
('EQ-1012', 'USB Logic Analyzer 8 Channel', 'Computer Engineering', 'equipment/usb-logic.jpg', 'AVAILABLE'),
('EQ-1013', 'Bench Power Supply 30V 5A', 'Computer Engineering', 'equipment/bench-power.jpg', 'AVAILABLE'),
('EQ-1014', 'Crimping Tool Set', 'Computer Engineering', 'equipment/crimping-tool.jpg', 'AVAILABLE'),
('EQ-1015', 'Anti-Static Wrist Strap', 'Computer Engineering', 'equipment/wrist-strap.jpg', 'AVAILABLE'),

-- Electronics Engineering Equipment (15 items)
('EQ-2001', 'Spectrum Analyzer Keysight N9320B', 'Electronics Engineering', 'equipment/spectrum-analyzer.jpg', 'AVAILABLE'),
('EQ-2002', 'Power Supply Keithley 2231A', 'Electronics Engineering', 'equipment/power-supply.jpg', 'AVAILABLE'),
('EQ-2003', 'Signal Generator Rohde & Schwarz', 'Electronics Engineering', 'equipment/signal-gen.jpg', 'AVAILABLE'),
('EQ-2004', 'LCR Meter BK Precision 891', 'Electronics Engineering', 'equipment/lcr-meter.jpg', 'AVAILABLE'),
('EQ-2005', 'Frequency Counter', 'Electronics Engineering', 'equipment/freq-counter.jpg', 'AVAILABLE'),
('EQ-2006', 'Insulation Tester Megger', 'Electronics Engineering', 'equipment/insulation-tester.jpg', 'AVAILABLE'),
('EQ-2007', 'Clamp Meter Fluke 376', 'Electronics Engineering', 'equipment/clamp-meter.jpg', 'AVAILABLE'),
('EQ-2008', 'Capacitance Meter', 'Electronics Engineering', 'equipment/capacitance-meter.jpg', 'AVAILABLE'),
('EQ-2009', 'Transistor Tester', 'Electronics Engineering', 'equipment/transistor-tester.jpg', 'AVAILABLE'),
('EQ-2010', 'RF Signal Generator', 'Electronics Engineering', 'equipment/rf-generator.jpg', 'AVAILABLE'),
('EQ-2011', 'Digital Storage Oscilloscope', 'Electronics Engineering', 'equipment/dso.jpg', 'AVAILABLE'),
('EQ-2012', 'Variable DC Power Supply', 'Electronics Engineering', 'equipment/variable-power.jpg', 'AVAILABLE'),
('EQ-2013', 'Analog Multimeter', 'Electronics Engineering', 'equipment/analog-multimeter.jpg', 'AVAILABLE'),
('EQ-2014', 'Decade Resistance Box', 'Electronics Engineering', 'equipment/resistance-box.jpg', 'AVAILABLE'),
('EQ-2015', 'Decade Capacitance Box', 'Electronics Engineering', 'equipment/capacitance-box.jpg', 'AVAILABLE'),

-- Chemistry/General Lab Equipment (20 items - Common items for easy identification)
('EQ-5001', 'Beaker 250mL Borosilicate Glass', 'Chemistry Laboratory', 'equipment/beaker-250ml.jpg', 'AVAILABLE'),
('EQ-5002', 'Beaker 500mL Borosilicate Glass', 'Chemistry Laboratory', 'equipment/beaker-500ml.jpg', 'AVAILABLE'),
('EQ-5003', 'Beaker 1000mL Borosilicate Glass', 'Chemistry Laboratory', 'equipment/beaker-1000ml.jpg', 'AVAILABLE'),
('EQ-5004', 'Erlenmeyer Flask 250mL', 'Chemistry Laboratory', 'equipment/flask-250ml.jpg', 'AVAILABLE'),
('EQ-5005', 'Erlenmeyer Flask 500mL', 'Chemistry Laboratory', 'equipment/flask-500ml.jpg', 'AVAILABLE'),
('EQ-5006', 'Volumetric Flask 100mL', 'Chemistry Laboratory', 'equipment/volumetric-flask.jpg', 'AVAILABLE'),
('EQ-5007', 'Graduated Cylinder 100mL', 'Chemistry Laboratory', 'equipment/graduated-cylinder.jpg', 'AVAILABLE'),
('EQ-5008', 'Test Tube 25x150mm (Set of 10)', 'Chemistry Laboratory', 'equipment/test-tubes.jpg', 'AVAILABLE'),
('EQ-5009', 'Test Tube Rack Plastic', 'Chemistry Laboratory', 'equipment/test-tube-rack.jpg', 'AVAILABLE'),
('EQ-5010', 'Pipette 10mL Glass', 'Chemistry Laboratory', 'equipment/pipette-10ml.jpg', 'AVAILABLE'),
('EQ-5011', 'Burette 50mL with Stand', 'Chemistry Laboratory', 'equipment/burette.jpg', 'AVAILABLE'),
('EQ-5012', 'Funnel Glass 75mm', 'Chemistry Laboratory', 'equipment/funnel.jpg', 'AVAILABLE'),
('EQ-5013', 'Stirring Rod Glass 200mm', 'Chemistry Laboratory', 'equipment/stirring-rod.jpg', 'AVAILABLE'),
('EQ-5014', 'Watch Glass 100mm', 'Chemistry Laboratory', 'equipment/watch-glass.jpg', 'AVAILABLE'),
('EQ-5015', 'Petri Dish 90mm (Pack of 10)', 'Chemistry Laboratory', 'equipment/petri-dish.jpg', 'AVAILABLE'),
('EQ-5016', 'Bunsen Burner', 'Chemistry Laboratory', 'equipment/bunsen-burner.jpg', 'AVAILABLE'),
('EQ-5017', 'Tripod Stand with Wire Gauze', 'Chemistry Laboratory', 'equipment/tripod-stand.jpg', 'AVAILABLE'),
('EQ-5018', 'Crucible Tongs', 'Chemistry Laboratory', 'equipment/crucible-tongs.jpg', 'AVAILABLE'),
('EQ-5019', 'Spatula Stainless Steel', 'Chemistry Laboratory', 'equipment/spatula.jpg', 'AVAILABLE'),
('EQ-5020', 'Dropper Bottle 30mL (Set of 5)', 'Chemistry Laboratory', 'equipment/dropper-bottle.jpg', 'AVAILABLE'),

-- Mechanical Engineering Equipment (10 items)
('EQ-3001', 'Vernier Caliper Mitutoyo 500-196', 'Mechanical Engineering', 'equipment/caliper.jpg', 'AVAILABLE'),
('EQ-3002', 'Micrometer Starrett 436', 'Mechanical Engineering', 'equipment/micrometer.jpg', 'AVAILABLE'),
('EQ-3003', 'Torque Wrench CDI 2503MFRPH', 'Mechanical Engineering', 'equipment/torque-wrench.jpg', 'MAINTENANCE'),
('EQ-3004', 'Dial Indicator Mitutoyo 2046S', 'Mechanical Engineering', 'equipment/dial-indicator.jpg', 'AVAILABLE'),
('EQ-3005', 'Angle Grinder Makita 9557NB', 'Mechanical Engineering', 'equipment/angle-grinder.jpg', 'AVAILABLE'),
('EQ-3006', 'Drill Press 16 Speed', 'Mechanical Engineering', 'equipment/drill-press.jpg', 'AVAILABLE'),
('EQ-3007', 'Bench Vise 6 inch', 'Mechanical Engineering', 'equipment/bench-vise.jpg', 'AVAILABLE'),
('EQ-3008', 'Hacksaw Frame with Blades', 'Mechanical Engineering', 'equipment/hacksaw.jpg', 'AVAILABLE'),
('EQ-3009', 'File Set (Flat, Round, Half-Round)', 'Mechanical Engineering', 'equipment/file-set.jpg', 'AVAILABLE'),
('EQ-3010', 'Tap and Die Set Metric', 'Mechanical Engineering', 'equipment/tap-die-set.jpg', 'AVAILABLE'),

-- Civil Engineering Equipment (10 items)
('EQ-4001', 'Concrete Compression Tester', 'Civil Engineering', 'equipment/compression-tester.jpg', 'AVAILABLE'),
('EQ-4002', 'Total Station Topcon ES-105', 'Civil Engineering', 'equipment/total-station.jpg', 'AVAILABLE'),
('EQ-4003', 'Soil Testing Kit', 'Civil Engineering', 'equipment/soil-kit.jpg', 'AVAILABLE'),
('EQ-4004', 'Theodolite Nikon NE-100', 'Civil Engineering', 'equipment/theodolite.jpg', 'AVAILABLE'),
('EQ-4005', 'Leveling Instrument Auto Level', 'Civil Engineering', 'equipment/auto-level.jpg', 'AVAILABLE'),
('EQ-4006', 'Measuring Tape 50m Fiberglass', 'Civil Engineering', 'equipment/measuring-tape.jpg', 'AVAILABLE'),
('EQ-4007', 'Concrete Slump Test Cone', 'Civil Engineering', 'equipment/slump-cone.jpg', 'AVAILABLE'),
('EQ-4008', 'Soil Moisture Meter', 'Civil Engineering', 'equipment/moisture-meter.jpg', 'AVAILABLE'),
('EQ-4009', 'Concrete Test Hammer Schmidt', 'Civil Engineering', 'equipment/test-hammer.jpg', 'AVAILABLE'),
('EQ-4010', 'Surveying Prism with Pole', 'Civil Engineering', 'equipment/prism-pole.jpg', 'AVAILABLE');

-- Insert active transactions (user_id 1 = Juan Dela Cruz)
INSERT INTO forge_transactions (txn_id, user_id, department, course, time_slot, txn_date, lab_room, adviser, status) VALUES
('TXN-20260322-001', 1, 'Computer Engineering', 'CPE 401 - Microprocessor Systems', '09:00-11:00', '2026-03-22', 'A-101', 'Prof. Roberto Santos', 'ACTIVE'),
('TXN-20260322-002', 2, 'Electronics Engineering', 'ECE 301 - Electronics Circuits', '11:00-13:00', '2026-03-22', 'B-201', 'Prof. Linda Reyes', 'ACTIVE'),
('TXN-20260322-003', 3, 'Mechanical Engineering', 'ME 201 - Manufacturing Processes', '13:00-15:00', '2026-03-22', 'C-302', 'Prof. Carlos Mendoza', 'PENDING_RETURN');

-- Insert transaction items
INSERT INTO forge_txn_items (txn_id, equipment_id, condition) VALUES
-- Juan's transaction
('TXN-20260322-001', 'EQ-1001', 'Excellent'),
('TXN-20260322-001', 'EQ-1003', 'Good'),
('TXN-20260322-001', 'EQ-1004', 'Excellent'),

-- Maria's transaction
('TXN-20260322-002', 'EQ-2001', 'Good'),
('TXN-20260322-002', 'EQ-2002', 'Excellent'),

-- Pedro's transaction
('TXN-20260322-003', 'EQ-3001', 'Good'),
('TXN-20260322-003', 'EQ-3002', 'Excellent');

-- Insert maintenance reports
INSERT INTO forge_maintenance (equipment_id, user_id, severity, description) VALUES
('EQ-3003', 3, 'High', 'Torque wrench calibration is off. Readings are inconsistent and unreliable.'),
('EQ-1005', 1, 'Medium', 'Soldering station temperature control is fluctuating. Needs inspection.');

-- Insert maintenance tickets
INSERT INTO forge_maintenance_tickets (report_id, assigned_to, status, priority) VALUES
(1, 6, 'IN_PROGRESS', 'High'),
(2, 6, 'OPEN', 'Medium');

-- Insert equipment events
INSERT INTO forge_equipment_events (equipment_id, event_type, performed_by, to_location, notes) VALUES
('EQ-1001', 'PROCURED', 6, 'A-101', 'New oscilloscope purchased for Computer Engineering lab'),
('EQ-2001', 'CALIBRATED', 6, 'B-201', 'Annual calibration completed'),
('EQ-3003', 'TRANSFERRED', 6, 'C-301', 'Moved to maintenance workshop for calibration');

-- Insert admin actions
INSERT INTO forge_admin_actions (admin_id, action_type, target_type, target_id, details) VALUES
(6, 'EQUIPMENT_CREATED', 'EQUIPMENT', 'EQ-1001', 'Added new Tektronix oscilloscope to inventory'),
(6, 'USER_CREATED', 'USER', '1', 'Registered new student Juan Dela Cruz'),
(6, 'MAINTENANCE_TICKET_CREATED', 'TICKET', '1', 'Created maintenance ticket for torque wrench calibration');

-- Insert scan log entries
INSERT INTO forge_scan_log (user_id, txn_id, equipment_id, s3_image_key, bedrock_response, predicted_name, confidence_score) VALUES
(1, 'TXN-20260322-001', 'EQ-1001', 'scans/2026-03-22/scan-001.jpg', '{"equipment": "Oscilloscope", "brand": "Tektronix", "model": "TDS2024C"}', 'Oscilloscope Tektronix TDS2024C', 95.50),
(2, 'TXN-20260322-002', 'EQ-2001', 'scans/2026-03-22/scan-002.jpg', '{"equipment": "Spectrum Analyzer", "brand": "Keysight"}', 'Spectrum Analyzer Keysight N9320B', 92.30);

-- Insert analytics data
INSERT INTO forge_analytics_daily (report_date, department, total_transactions, total_equipment_borrowed, total_maintenance_reports, avg_session_duration) VALUES
('2026-03-21', 'Computer Engineering', 5, 12, 1, 105),
('2026-03-21', 'Electronics Engineering', 3, 8, 0, 95),
('2026-03-21', 'Mechanical Engineering', 2, 5, 2, 110),
('2026-03-22', 'Computer Engineering', 1, 3, 1, 0),
('2026-03-22', 'Electronics Engineering', 1, 2, 0, 0),
('2026-03-22', 'Mechanical Engineering', 1, 2, 0, 0);

-- Verify data insertion
SELECT 'Users' AS table_name, COUNT(*) AS count FROM forge_users
UNION ALL
SELECT 'Lab Rooms', COUNT(*) FROM forge_lab_rooms
UNION ALL
SELECT 'Equipment', COUNT(*) FROM forge_equipment
UNION ALL
SELECT 'Transactions', COUNT(*) FROM forge_transactions
UNION ALL
SELECT 'Transaction Items', COUNT(*) FROM forge_txn_items
UNION ALL
SELECT 'Maintenance Reports', COUNT(*) FROM forge_maintenance
UNION ALL
SELECT 'Maintenance Tickets', COUNT(*) FROM forge_maintenance_tickets
ORDER BY table_name;

-- Sample acquisition record
INSERT INTO forge_acquisitions (supplier_name, acquisition_date, notes, created_by) VALUES
('TechSupply PH', '2026-03-01', 'Q1 lab equipment procurement batch', 6);

-- Sample acquisition request from a student
INSERT INTO forge_acquisition_requests (user_id, equipment_name, department, quantity, reason, urgency, status) VALUES
(1, 'Arduino Mega 2560', 'Computer Engineering', 3,
 'Required for CPE 402 embedded systems project. Current stock is insufficient for the class size.',
 'High', 'PENDING');
