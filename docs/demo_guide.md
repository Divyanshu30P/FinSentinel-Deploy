# FinSentinel - Product Walkthrough & Demonstration Guide

**Project**: FinSentinel  
**Domain**: Financial Cybersecurity & Scam Detection  

---

## Demonstration Overview

| Stage | Focus | Action / Highlights |
|---|---|---|
| **Overview** | **Threat Landscape** | Introduce FinSentinel: Digital payment fraud landscape (1930 helpline statistics, fake collect requests, electricity SMS scams). |
| **Phishing Detector** | **NLP & Entity Analysis** | Click "⚡ Electricity Bill Threat", run scan, show highlighted malicious spans, TF-IDF + Logistic Regression ML classification, and AI explanation. |
| **Collect Scanner** | **PIN Deception Defense** | Click "Diwali Reward PIN Scam", explain that typing a UPI PIN *debits* money, show High Risk assessment and clear safety steps. |
| **Transaction Analyser** | **Behavioral Anomalies** | Click "Load Demo Statement", demonstrate Isolation Forest & velocity detector catching the 2:41 AM 3-part bank drain attack. |
| **Dashboard & Audit Log** | **Unified Monitoring** | Show unified activity charts, risk distribution donut, recent alerts, and individual detail modal in History. |
| **Normal vs Showcase Mode** | **Public Deployment** | Show the topbar switcher: users can register their own personal account in Normal Mode or inspect the sample profile. |

---

## Step-by-Step Demonstration Script

### 1. Introduction
> *"Digital payment ecosystems process over 14 billion transactions monthly. However, users face an escalating onslaught of social engineering attacks: deceptive collect requests, phishing SMS, and account drain bursts. **FinSentinel: Detect. Analyse. Protect.** is built specifically for digital payment scenarios with lightweight machine learning and explainable AI."*

### 2. Phishing Message Detection
1. In the sidebar, click **Phishing Detector**.
2. Click the preset button: `⚡ Electricity Bill Threat`.
3. Notice the deceptive text: *"Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM..."*
4. Click **Run AI Phishing Analysis**.
5. Observe:
   - **Risk Score**: 96/100 (HIGH RISK).
   - **NLP ML Confidence**: 99.4% Phishing.
   - **Visual Highlighting**: Shows highlighted phrases such as `power will be disconnected` and the unverified URL.
   - **AI Contextual Explanation**: Explains that power boards never use personal mobile numbers for disconnection threats.

### 3. Fake UPI Collect Request Detection
1. In sidebar, click **Collect Request Scanner**.
2. Click the preset button: `Diwali Reward PIN Scam`.
3. Notice the scam trap: Sender asks user to *"Enter UPI PIN to receive Rs 4999 cashback"*.
4. Click **Analyze Collect Request**.
5. Key insight:
   - *"UPI PIN is exclusively for DEBITING funds. It is never required to receive money."*
   - Shows the `CRITICAL` indicator override and the 92/100 High Risk score.

### 4. Suspicious Transaction Anomaly Detection
1. In sidebar, click **Transaction Analyser**.
2. Click **Load Demo Statement**.
3. Notice the summary banner:
   - 24 total transactions scanned.
   - 3 severe anomalies detected.
4. Review the transactions table:
   - Normal daytime transactions (Swiggy, Groceries) are green (Low Risk).
   - The 3 rapid transactions at 2:41 AM totaling ₹94,998 are flagged with: `Isolation Forest Outlier`, `Late Night (1-5 AM)`, `Rapid Velocity (3 in 1hr)`.

Note: Transaction-analysis results are displayed in the Transaction Analyser for the current browser session and are intentionally not added to the persistent audit history.

### 5. Unified Dashboard & Audit History
1. Click **Overview** in the sidebar.
2. Review the live Chart.js activity graph and threat risk distribution donut.
3. Review the Active Fraud Alerts.
4. Click **Analysis History** to demonstrate the full audit log, filters, and detail modal.

### 6. Normal Mode for Public Users
1. Click **Sign In / Register** in the topbar.
2. Demonstrate how any real user can register a new personal account to use the application with their own isolated data.
