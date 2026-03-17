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

### Prerequisites
* **Node.js** (LTS Version)
* **GitHub Account** (For team version control)
* **Oracle Thin Mode** (Required for Node-Oracle connectivity without instant client)

### Backend Installation (`/backend`)
```bash
npm install express oracledb @aws-sdk/client-s3 @aws-sdk/client-bedrock-runtime dotenv cors
