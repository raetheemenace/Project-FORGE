-- ============================================================
-- FORGE Database Schema
-- Oracle 19c EE | PDB: orclpdb
-- Run this script connected to orclpdb as SYSTEM or DBA user
-- ============================================================

-- Create dedicated schema user
CREATE USER forge_user IDENTIFIED BY forge_pass
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

GRANT CONNECT, RESOURCE TO forge_user;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE,
      CREATE PROCEDURE, CREATE TRIGGER TO forge_user;

-- Switch to forge_user context (run remaining as forge_user)
-- ALTER SESSION SET CURRENT_SCHEMA = forge_user;

-- ============================================================
-- TABLE: FORGE_USERS
-- ============================================================
CREATE TABLE forge_user.FORGE_USERS (
    USER_ID       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    STUDENT_ID    CHAR(7),
    USERNAME      VARCHAR2(100) UNIQUE NOT NULL,
    PASSWORD_HASH VARCHAR2(255) NOT NULL,
    FULL_NAME     VARCHAR2(200) NOT NULL,
    PROGRAM       VARCHAR2(200),
    ROLE          VARCHAR2(20) DEFAULT 'STUDENT'
                  CHECK (ROLE IN ('STUDENT', 'LAB_ADMIN')),
    CREATED_AT    TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_LAB_ROOMS
-- ============================================================
CREATE TABLE forge_user.FORGE_LAB_ROOMS (
    ROOM_ID    VARCHAR2(20) PRIMARY KEY,
    ROOM_NAME  VARCHAR2(200) NOT NULL,
    DEPARTMENT VARCHAR2(50)  NOT NULL,
    CAPACITY   NUMBER,
    STATUS     VARCHAR2(20) DEFAULT 'ACTIVE'
               CHECK (STATUS IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE'))
);

-- ============================================================
-- TABLE: FORGE_EQUIPMENT
-- ============================================================
CREATE TABLE forge_user.FORGE_EQUIPMENT (
    EQUIPMENT_ID VARCHAR2(20) PRIMARY KEY,
    NAME         VARCHAR2(200) NOT NULL,
    DEPARTMENT   VARCHAR2(50)  NOT NULL,
    S3_IMAGE_KEY VARCHAR2(500),
    STATUS       VARCHAR2(20) DEFAULT 'AVAILABLE'
                 CHECK (STATUS IN ('AVAILABLE', 'BORROWED', 'MAINTENANCE', 'DISPOSED'))
);

-- ============================================================
-- TABLE: FORGE_TRANSACTIONS
-- ============================================================
CREATE TABLE forge_user.FORGE_TRANSACTIONS (
    TXN_ID     VARCHAR2(30) PRIMARY KEY,
    USER_ID    NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    DEPARTMENT VARCHAR2(50)  NOT NULL,
    COURSE     VARCHAR2(100) NOT NULL,
    TIME_SLOT  VARCHAR2(50)  NOT NULL,
    TXN_DATE   DATE          NOT NULL,
    LAB_ROOM   VARCHAR2(20)  NOT NULL,
    ADVISER    VARCHAR2(200) NOT NULL,
    STATUS     VARCHAR2(20) DEFAULT 'ACTIVE'
               CHECK (STATUS IN ('ACTIVE', 'PENDING_RETURN', 'CLAIM_ID', 'RETURNED')),
    CREATED_AT TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_TXN_ITEMS
-- ============================================================
CREATE TABLE forge_user.FORGE_TXN_ITEMS (
    ITEM_ID      NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    TXN_ID       VARCHAR2(30) REFERENCES forge_user.FORGE_TRANSACTIONS(TXN_ID),
    EQUIPMENT_ID VARCHAR2(20) REFERENCES forge_user.FORGE_EQUIPMENT(EQUIPMENT_ID),
    CONDITION    VARCHAR2(20) CHECK (CONDITION IN ('Excellent', 'Good', 'Fair', 'Poor'))
);

-- ============================================================
-- TABLE: FORGE_MAINTENANCE
-- ============================================================
CREATE TABLE forge_user.FORGE_MAINTENANCE (
    REPORT_ID    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    EQUIPMENT_ID VARCHAR2(20) REFERENCES forge_user.FORGE_EQUIPMENT(EQUIPMENT_ID),
    USER_ID      NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    SEVERITY     VARCHAR2(20) CHECK (SEVERITY IN ('Low', 'Medium', 'High', 'Critical')),
    DESCRIPTION  VARCHAR2(2000) NOT NULL,
    CREATED_AT   TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_SCAN_LOG
-- ============================================================
CREATE TABLE forge_user.FORGE_SCAN_LOG (
    SCAN_ID          NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    USER_ID          NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    TXN_ID           VARCHAR2(30) REFERENCES forge_user.FORGE_TRANSACTIONS(TXN_ID),
    EQUIPMENT_ID     VARCHAR2(20) REFERENCES forge_user.FORGE_EQUIPMENT(EQUIPMENT_ID),
    S3_IMAGE_KEY     VARCHAR2(500),
    BEDROCK_RESPONSE VARCHAR2(4000),
    PREDICTED_NAME   VARCHAR2(200),
    CONFIDENCE_SCORE NUMBER(5,2),
    CREATED_AT       TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_EQUIPMENT_EVENTS
-- ============================================================
CREATE TABLE forge_user.FORGE_EQUIPMENT_EVENTS (
    EVENT_ID     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    EQUIPMENT_ID VARCHAR2(20) REFERENCES forge_user.FORGE_EQUIPMENT(EQUIPMENT_ID),
    EVENT_TYPE   VARCHAR2(20)
                 CHECK (EVENT_TYPE IN ('PROCURED', 'TRANSFERRED', 'DISPOSED', 'CALIBRATED')),
    PERFORMED_BY NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    FROM_LOCATION VARCHAR2(200),
    TO_LOCATION   VARCHAR2(200),
    NOTES         VARCHAR2(2000),
    CREATED_AT    TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_ADMIN_ACTIONS
-- ============================================================
CREATE TABLE forge_user.FORGE_ADMIN_ACTIONS (
    ACTION_ID   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ADMIN_ID    NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    ACTION_TYPE VARCHAR2(50) NOT NULL,
    TARGET_TYPE VARCHAR2(50),
    TARGET_ID   VARCHAR2(100),
    DETAILS     VARCHAR2(2000),
    CREATED_AT  TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_MAINTENANCE_TICKETS
-- ============================================================
CREATE TABLE forge_user.FORGE_MAINTENANCE_TICKETS (
    TICKET_ID   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    REPORT_ID   NUMBER REFERENCES forge_user.FORGE_MAINTENANCE(REPORT_ID),
    ASSIGNED_TO NUMBER REFERENCES forge_user.FORGE_USERS(USER_ID),
    STATUS      VARCHAR2(20) DEFAULT 'OPEN'
                CHECK (STATUS IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    PRIORITY    VARCHAR2(20) CHECK (PRIORITY IN ('Low', 'Medium', 'High', 'Critical')),
    RESOLUTION  VARCHAR2(2000),
    RESOLVED_AT TIMESTAMP,
    CREATED_AT  TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ============================================================
-- TABLE: FORGE_ANALYTICS_DAILY
-- ============================================================
CREATE TABLE forge_user.FORGE_ANALYTICS_DAILY (
    ANALYTICS_ID              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    REPORT_DATE               DATE NOT NULL,
    DEPARTMENT                VARCHAR2(50),
    TOTAL_TRANSACTIONS        NUMBER DEFAULT 0,
    TOTAL_EQUIPMENT_BORROWED  NUMBER DEFAULT 0,
    TOTAL_MAINTENANCE_REPORTS NUMBER DEFAULT 0,
    AVG_SESSION_DURATION      NUMBER,
    CREATED_AT                TIMESTAMP DEFAULT SYSTIMESTAMP,
    UNIQUE (REPORT_DATE, DEPARTMENT)
);

-- ============================================================
-- SEQUENCE: Daily TXN counter (resets per day via app logic)
-- ============================================================
CREATE SEQUENCE forge_user.FORGE_TXN_SEQ
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- ============================================================
-- SEED DATA: Lab Rooms
-- ============================================================
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('A-101', 'Chemistry Lab',    'Chemistry',   30, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('A-102', 'Physics Lab',      'Physics',     25, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('A-104', 'Engineering Lab',  'Engineering', 28, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('B-202', 'Electronics Lab',  'Engineering', 20, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('C-301', 'Materials Lab',    'Chemistry',   22, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('C-302', 'Simulation Lab',   'Engineering', 35, 'ACTIVE');
INSERT INTO forge_user.FORGE_LAB_ROOMS VALUES ('ROBO',  'Robotics Wing',    'Engineering', 15, 'ACTIVE');

-- ============================================================
-- SEED DATA: Equipment
-- ============================================================
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-1001', 'Erlenmeyer Flask 500ml', 'Chemistry',   NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-1002', 'Bunsen Burner',          'Chemistry',   NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-1003', 'Beaker 250ml',           'Chemistry',   NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-1004', 'Magnetic Stirrer',       'Chemistry',   NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-2001', 'Oscilloscope #1',        'Physics',     NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-2002', 'Oscilloscope #2',        'Physics',     NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-2003', 'Spectrum Analyzer',      'Physics',     NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3001', '3D Printer #1',          'Engineering', NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3002', '3D Printer #2',          'Engineering', NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3003', 'Laser Cutter',           'Engineering', NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3004', 'CNC Mill',               'Engineering', NULL, 'MAINTENANCE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3005', 'Soldering Station',      'Engineering', NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-3006', 'Arduino Starter Kit',    'Engineering', NULL, 'AVAILABLE');
INSERT INTO forge_user.FORGE_EQUIPMENT VALUES ('EQ-7167', 'Bunsen Burner B-7167',   'Chemistry',   NULL, 'AVAILABLE');

-- ============================================================
-- SEED DATA: Admin user (password: admin123 — bcrypt hash)
-- Replace hash with actual bcrypt output before production use
-- ============================================================
INSERT INTO forge_user.FORGE_USERS
    (STUDENT_ID, USERNAME, PASSWORD_HASH, FULL_NAME, PROGRAM, ROLE)
VALUES
    (NULL, 'admin', '$2b$10$YourBcryptHashHere', 'Lab Administrator', 'Administration', 'LAB_ADMIN');

COMMIT;
