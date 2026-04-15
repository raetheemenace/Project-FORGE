-- Complete Chemistry, Physics & General Lab Equipment
-- Run this to populate all departments properly

-- ==========================
-- CHEMISTRY LAB EQUIPMENT (30 items)
-- ==========================
INSERT INTO forge_equipment (equipment_id, name, department, status, total_quantity) VALUES
('EQ-5001', 'Beaker 250mL Borosilicate Glass', 'Chemistry Laboratory', 'AVAILABLE', 12),
('EQ-5002', 'Beaker 500mL Borosilicate Glass', 'Chemistry Laboratory', 'AVAILABLE', 10),
('EQ-5003', 'Beaker 1000mL Borosilicate Glass', 'Chemistry Laboratory', 'AVAILABLE', 8),
('EQ-5004', 'Erlenmeyer Flask 250mL', 'Chemistry Laboratory', 'AVAILABLE', 15),
('EQ-5005', 'Erlenmeyer Flask 500mL', 'Chemistry Laboratory', 'AVAILABLE', 10),
('EQ-5006', 'Volumetric Flask 100mL Class A', 'Chemistry Laboratory', 'AVAILABLE', 6),
('EQ-5007', 'Graduated Cylinder 100mL', 'Chemistry Laboratory', 'AVAILABLE', 8),
('EQ-5008', 'Test Tube 25x150mm (Set of 10)', 'Chemistry Laboratory', 'AVAILABLE', 20),
('EQ-5009', 'Test Tube Rack Plastic', 'Chemistry Laboratory', 'AVAILABLE', 12),
('EQ-5010', 'Pipette 10mL Glass', 'Chemistry Laboratory', 'AVAILABLE', 15),
('EQ-5011', 'Burette 50mL with Stand', 'Chemistry Laboratory', 'AVAILABLE', 6),
('EQ-5012', 'Funnel Glass 75mm', 'Chemistry Laboratory', 'AVAILABLE', 15),
('EQ-5013', 'Stirring Rod Glass 200mm', 'Chemistry Laboratory', 'AVAILABLE', 25),
('EQ-5014', 'Watch Glass 100mm', 'Chemistry Laboratory', 'AVAILABLE', 20),
('EQ-5015', 'Petri Dish 90mm (Pack of 10)', 'Chemistry Laboratory', 'AVAILABLE', 30),
('EQ-5016', 'Bunsen Burner', 'Chemistry Laboratory', 'AVAILABLE', 10),
('EQ-5017', 'Tripod Stand with Wire Gauze', 'Chemistry Laboratory', 'AVAILABLE', 10),
('EQ-5018', 'Crucible Tongs', 'Chemistry Laboratory', 'AVAILABLE', 10),
('EQ-5019', 'Spatula Stainless Steel', 'Chemistry Laboratory', 'AVAILABLE', 20),
('EQ-5020', 'Dropper Bottle 30mL (Set of 5)', 'Chemistry Laboratory', 'AVAILABLE', 15),
('EQ-5021', 'pH Meter Digital', 'Chemistry Laboratory', 'AVAILABLE', 4),
('EQ-5022', 'Analytical Balance 0.0001g', 'Chemistry Laboratory', 'AVAILABLE', 3),
('EQ-5023', 'Hot Plate Magnetic Stirrer', 'Chemistry Laboratory', 'AVAILABLE', 6),
('EQ-5024', 'Centrifuge Machine', 'Chemistry Laboratory', 'AVAILABLE', 2),
('EQ-5025', 'Distillation Apparatus Kit', 'Chemistry Laboratory', 'AVAILABLE', 3),
('EQ-5026', 'Spectrophotometer', 'Chemistry Laboratory', 'AVAILABLE', 2),
('EQ-5027', 'Fume Hood', 'Chemistry Laboratory', 'AVAILABLE', 4),
('EQ-5028', 'Desiccator Glass', 'Chemistry Laboratory', 'AVAILABLE', 6),
('EQ-5029', 'Mortar and Pestle Porcelain', 'Chemistry Laboratory', 'AVAILABLE', 12),
('EQ-5030', 'Thermometer Digital -10 to 110°C', 'Chemistry Laboratory', 'AVAILABLE', 20);

-- ==========================
-- PHYSICS LAB EQUIPMENT (25 items)
-- ==========================
INSERT INTO forge_equipment (equipment_id, name, department, status, total_quantity) VALUES
('EQ-6001', 'Laser Diode 5mW 650nm', 'Physics', 'AVAILABLE', 12),
('EQ-6002', 'Optical Bench 1 Meter', 'Physics', 'AVAILABLE', 6),
('EQ-6003', 'Simple Pendulum Apparatus', 'Physics', 'AVAILABLE', 15),
('EQ-6004', 'Force Table 40cm', 'Physics', 'AVAILABLE', 8),
('EQ-6005', 'Spherometer', 'Physics', 'AVAILABLE', 6),
('EQ-6006', 'Vernier Caliper 150mm', 'Physics', 'AVAILABLE', 20),
('EQ-6007', 'Micrometer Screw Gauge', 'Physics', 'AVAILABLE', 15),
('EQ-6008', 'Travelling Microscope', 'Physics', 'AVAILABLE', 4),
('EQ-6009', 'Newton's Second Law Apparatus', 'Physics', 'AVAILABLE', 10),
('EQ-6010', 'Atwood Machine', 'Physics', 'AVAILABLE', 8),
('EQ-6011', 'Ballistic Pendulum', 'Physics', 'AVAILABLE', 6),
('EQ-6012', 'Spring Constant Apparatus', 'Physics', 'AVAILABLE', 12),
('EQ-6013', 'Resonance Tube Apparatus', 'Physics', 'AVAILABLE', 6),
('EQ-6014', 'Sonometer', 'Physics', 'AVAILABLE', 8),
('EQ-6015', 'Melde's String Apparatus', 'Physics', 'AVAILABLE', 6),
('EQ-6016', 'Wave Generator', 'Physics', 'AVAILABLE', 4),
('EQ-6017', 'Signal Generator 1MHz', 'Physics', 'AVAILABLE', 6),
('EQ-6018', 'Multi Range Ammeter', 'Physics', 'AVAILABLE', 15),
('EQ-6019', 'Multi Range Voltmeter', 'Physics', 'AVAILABLE', 15),
('EQ-6020', 'Potentiometer', 'Physics', 'AVAILABLE', 10),
('EQ-6021', 'Wheatstone Bridge', 'Physics', 'AVAILABLE', 8),
('EQ-6022', 'Tangent Galvanometer', 'Physics', 'AVAILABLE', 6),
('EQ-6023', 'Bar Magnet Set', 'Physics', 'AVAILABLE', 25),
('EQ-6024', 'Electromagnet Kit', 'Physics', 'AVAILABLE', 12),
('EQ-6025', 'Prism Glass Equilateral', 'Physics', 'AVAILABLE', 15);

-- ==========================
-- Verify insertion
-- ==========================
SELECT department, COUNT(*) as equipment_count
FROM forge_equipment
GROUP BY department
ORDER BY department;