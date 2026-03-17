# FORGE: A Cloud-Native Multimodal Management Platform 
### Transactional Ledger for Multidisciplinary Equipments and Laboratories
**Courses:** Information Management, HCI 2 and Platform Technologies.
**Institution:** Technological Institute of the Philippines - Manila

---

## 📋 Executive Summary
**FORGE** is a cloud-native, multimodal lab management system designed to revolutionize how students and faculty interact with high-value lab equipment and inventories. By integrating an **Oracle 19c enterprise ledger** with an **AWS-hosted environment**, FORGE provides a secure, real-time environment for tracking assets. The system features an **HCI-focused Progressive Web App (PWA)** that utilizes **Voice, Vision, and Haptic feedback**, allowing for hands-free operation in demanding laboratory settings.

### Problem Description
* **Touch-Inefficient Environments:** Laboratory settings often involve gloves or occupied hands, making traditional entry difficult.
* **Database Concurrency Conflicts:** Traditional systems often fail when multiple users attempt to claim limited resources simultaneously.
* **Lack of Real-Time Visibility:** Manual logs result in "ghost assets" and inefficient management.

---

## 👥 The FORGE Team
| Name | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **John Raven S. Unera** | **Fullstack & Integration** | AWS Infrastructure (RDS, Bedrock, S3), Frontend/Backend bridging, and GitHub management. |
| **Adonis, Kate Russel E.** | **Backend Developer** | Node.js/Express.js server-side logic and Oracle 19c SQL architecture. |
| **Valdez, Zoe Felicia L.** | **Frontend Developer** | React.js PWA development, Multimodal HCI (Voice, Vision, Haptics). |

---

## 💻 Tech Stack 
| Category | Tool / Language | Usage |
| :--- | :--- | :--- |
| **Database** | **Oracle 19c** | ACID-compliant authoritative ledger for all transactions. |
| **Backend** | **Node.js / Express.js** | Server-side logic to bridge the UI, AI, and Database. |
| **Frontend** | **React.js** | Building the PWA core with camera and voice integration. |
| **AI Engine** | **AWS Bedrock** | Image Identification engine (Claude 3 Haiku) for equipment. |
| **Design** | **Tailwind CSS / Figma** | Mapping ERDs, Cloud Architecture, and Multimodal UI. |

---

## ☁️ AWS Services 
* **Amazon RDS (Oracle 19c):** Hosting the Oracle instance on the `db.t3.micro` Free Tier.
* **Amazon S3:** Storing raw high-resolution images of equipment for audit trails.
* **AWS Bedrock:** Powering the **Claude 3 Haiku** image identification engine.
* **AWS Amplify / Beanstalk:** Hosting the PWA frontend and the Node.js backend.
* **Multimodal Integration:** Utilizing AWS services for Voice Guidance (Polly) and Speech-to-Text (Transcribe).

---

## 📦 Dependencies & Installation

### Prerequisites to Install
| Software| Version | Command to Verify |
| :--- | :--- | :--- |
| **Node.js** | **v24.14.0 (LTS)** | node -v |
| **npm** | **v11.9.0** | npm -v |
| **git** | **v2.48+** | git --version |

**Backend Installation** (`/backend`)
cd to /backend, then run "npm init -y" then install these specific versions:

**express**: v5.1.0 (The current stable standard with native async support).

**oracledb**: v6.10.x (Essential for your Oracle 19c connection).

**dotenv**: v16.4.x (For your .env secrets).

AWS Integration:

**@aws-sdk/client-bedrock-runtime**: v3.7xx.x (For the lab equipment AI scanning).

**@aws-sdk/client-s3**: v3.7xx.x (For storing images of equipment).

Development Tools:

**nodemon**: v3.1.x (To auto-restart your server).

**cors**: v2.8.x (To allow your React frontend to talk to your Node server).

**Frontend Installation** (`/frontend`)
Project Setup:
**vite**: v8.0.x * react & react-dom: v19.0.x

**@vitejs/plugin-react**: v6.x

UI & Logic:

**axios**: v1.7.x (To send data to your backend).

**lucide-react**: v0.4xx.x (For clean icons in your HCI 2 dashboard).

**tailwindcss**: v4.x (For rapid styling).
