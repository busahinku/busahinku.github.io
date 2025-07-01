---
title: Reports
description: This project includes all of my undergraduate reports for some courses.
date: '12-12-2050'
tags: ['LaTeX', 'KaTeX','Word', 'Figma', 'Python', 'R', 'Seaborn', 'NumPy', 'pandas', 'Matplotlib', 'ggplot']
mainPhoto: 'https://mir-s3-cdn-cf.behance.net/project_modules/fs/a01e31219345373.6863d7192daa6.png'
demoUrl: 'https://public.tableau.com/app/profile/burak.k.k/viz/Original-6--OverviewofShoppingData/OverviewofShoppingBehaviourHabitsandData'
githubUrl: 'https://github.com/busahinku/STAT112_Course_Final'
type: "data-analysis"
---
This archive contains summaries of all the reports I have written during my undergraduate university education, listed from newest to oldest. Each report includes a link to the full PDF file, key points from the study, important findings, and visuals used in the analysis.

---

## Analyzing Global Economic Indicators (STAT 250 Final Project, 2025)
![Introduction Image for STAT250 Final Report](/images/STAT250ReportBanner.png)


**Course:** STAT250, Applied Statistics  
**University:** Middle East Technical University (METU)  
**Date Submitted:** June 2, 2025  
**Authors:** Burak Şahin Küçük, Selin Aytan, İdil Bükre Tuzkaya  
**Download the full report:** [Click here to view the PDF](https://drive.google.com/file/d/14w-2mMoMO0vdi02hKJp2tl-5lmr9cVtw/view?usp=sharing)

### Project Overview

This project explores how economic and social indicators (like GDP, HDI, life expectancy, unemployment, and gender equality) are related across different countries between 2004 and 2017. We used data from the **World Bank** and **United Nations Human Development Index (HDI)** to analyze how these indicators affect each other with a special focus on **Türkiye’s position** in the world.

### Methods Used

- **Data Cleaning & Merging**: Combined HDI and World Bank datasets for 180+ countries (2004–2017) and handled with missing data.
- **Statistical Tests**:
  - ANOVA to test differences in life expectancy by income group
  - Tukey HSD for pairwise group comparisons
  - Spearman & Pearson correlations
  - Linear regression (OLS) for modeling life expectancy
- **Visualization**:
  - Scatter plots, box plots, bar charts, and world maps
  - Comparison of Türkiye with global and high-HDI countries

### Key Findings

- **Income vs Life Expectancy**: Higher income groups live longer and show less variation. The gap between low- and high-income countries is over 20 years.
- **Infant Mortality**: Strong negative relationship with life expectancy. Just one fewer infant death per 1,000 births can raise average life expectancy by ~0.34 years.
- **GDP Relationship**: Life expectancy increases with GDP per capita, but gains slow down after a certain point. Türkiye performs better than expected for its income level.
- **Unemployment**: Huge differences exist within continents. Some countries have extreme values, but on a global scale, they may still seem moderate.
- **Gender Inequality**:
  - Women are underrepresented in parliament (only 15% in Türkiye)
  - Lower female labor participation and schooling in Türkiye compared to global average
  - High-HDI countries have narrower gender gaps but still show inequality

### Visuals Used
1. **Life Expectancy by Income Group** (box plot)
2. **GDP per Capita vs Life Expectancy** (scatter plot)
3. **Life Expectancy vs Infant Mortality** (regression)
4. **Unemployment Maps** for all continents
5. **Gender Gap Graphs** (education, labor force, parliament)
6. **GDP Trends Over Time** (highlighting 2008 crisis, oil shocks, Brexit)


### Conclusion

This project clearly shows that income, health, and social outcomes are deeply connected. Life expectancy rises with income but reducing **infant mortality** and improving **education and gender equality** can make just as big a difference.

- Türkiye is doing well in some areas like GDP vs life expectancy...
- But still has **significant gender gaps** in education, employment, and politics.
- Global crises (like the 2008 recession) affect high-income countries more, while low-income nations remain isolated, not necessarily because they are strong, but because they are not fully integrated into the global economy.

---
## Hospital Appointment System with Start-Up Approach (STAT295 Project, 2025)
![Introduction Image for STAT295 Final Report](/images/STAT295ReportBanner.png)

**Course:** STAT295 — Object-Oriented Programming  
**University:** Middle East Technical University (METU)  
**Date Submitted:** May 18, 2025  
**Authors:** Burak Şahin Küçük, Berat Özkan, Furkan Karakurt, Emre Kale, Fuad İbrahimli  
**Download the full report:** [Click here to view the PDF](https://drive.google.com/file/d/1s2dCleDkFFoLfKFl-IzgaBUIoPWdDpX4/view?usp=sharing)

### Project Overview
This project presents a startup-style hospital appointment system developed in Java using Object-Oriented Programming (OOP) principles. It includes a terminal-based interface and an exploratory JavaFX GUI for scheduling doctor appointments, managing patients, prescriptions, billing, and more. Each user type (doctor, assistant, founder, pharmacist, patient) interacts with the system through role-specific functionality.

### Features
- **Appointment Management**: Tracks appointment times, avoids conflicts, calculates fees.
- **User Roles**: Doctors, assistants, patients, pharmacists, and the founder all have distinct roles.
- **Medical Records**: Each patient has a medical record, accessible to doctors.
- **Billing System**: Fee calculation varies by doctor type (private/public); integrates simple payment status.
- **Scheduling**: A static weekly time-slot schedule is assigned to doctors.
- **Terminal UI**: Interactive CLI interface using Scanner, switch-case, lists, and formatted strings.
- **JavaFX GUI**: Prototype user-friendly interface with login and registration pages.
- **UML Structure**: Designed with a base Person class and subclasses for each role.

### Object-Oriented Programming Concepts
- **Encapsulation**: All data is private; access is via getters and setters.
- **Inheritance**: A Person superclass is inherited by Doctor, Patient, Assistant, etc.
- **Polymorphism**: Overridden methods like generalInfo() show dynamic behavior.
- **Abstraction**: A Prescribable interface defines how prescriptions work across relevant classes.

### Sample Flow (Private Clinic Appointment)
1. Patient selects a doctor by specialty.
2. Chooses a time slot using StaticSchedule.
3. Appointment is created and cost calculated.
4. Doctor writes a prescription.
5. Pharmacist fulfills the prescription.
6. Patient receives a bill and optionally leaves a review.

### Conclusion
This OOP-focused project showed that even a terminal-based Java program can simulate real-world scheduling logic. We met course objectives by practicing encapsulation, inheritance, polymorphism, and abstraction. The foundation we built allows for future improvements like a dynamic scheduler, database integration, and secure login systems.

---
## Analysis of Crime Dynamics by Five States (2000–2023) (STAT112 Final Project)
![Introduction Image for STAT112 Final Report](/images/STAT111ReportBanner.png)

**Course:** STAT112 Final Project  
**University:** Middle East Technical University (METU)  
**Date Submitted:** January 2024 (Fall Semester)  
**Authors:** Burak Şahin Küçük, Fajrin Akbarli, Emek Bilge Aydın, Furkan Karakurt, Anindya Haning Utami  
**Download the full report:** [Click here to view the PDF](https://docs.google.com/document/d/1fjiru0pNxAimnGnyBBsc_hgtSoxoK5so/edit?usp=sharing&ouid=117838242683814174498&rtpof=true&sd=true)

### Project Overview

This study analyzes crime data across five U.S. states between 2000 and 2023. It investigates patterns and relationships between crime rates and factors like urbanization, income, education, and unemployment. After rigorous data cleaning and preparation using Python, visualizations were created to answer key research questions.


### Dataset Summary

- **Observations:** 120 rows
- **Variables:** 14 (including Arrests, Victims, Income, Education Level, Crime Type, Urbanization)
- **States Analyzed:** New York, California, Texas, Florida, Pennsylvania
- **Libraries Used:** Pandas, NumPy, Seaborn, Matplotlib


### Data Cleaning Process

- Fixed missing values using mean/mode imputation
- Renamed columns for clarity and consistency
- Converted formats (e.g., salaries, numeric parsing)
- Standardized categories (e.g., Urbanization, Education)
- Removed duplicates and corrected outliers (only observed, not deleted)
- Created new variables: Arrest_Rate, Victim_Rate


### Research Questions & Key Findings

1. **How has the violent crime rate changed from 2000 to 2023?**  
   → Crime initially declined but began rising steadily after 2014, peaking in 2023.

2. **How do crime rates differ in urban vs suburban areas?**  
   → Urban areas generally show higher crime variability and median rates compared to suburban ones.

3. **How does victimization vary by state?**  
   → Pennsylvania has the highest median victim rate, California the lowest. Box plots revealed wide variance in PA.

4. **Does income correlate with property crimes across education levels?**  
   → Yes. A strong positive correlation (r ≈ 0.93) exists between income and property crimes, especially in college-educated groups.

5. **What is the relationship between crime type and total crime rates by state?**  
   → Heatmap reveals that California leads in violent crime; Texas and Florida show higher property crime ratios.


### Statistical Highlights

- **Average Income (All States):** $90,092  
- **Victim Rate (Mean):** 718 per 100,000  
- **Arrest Rate (Mean):** 607 per 100,000  
- **Crime Rate Range:** 75.5 to 377  
- **Notable Outliers:** Unemployment rate in 2 records — retained for analysis relevance.

### Conclusion

This report illustrates the complex interaction between socioeconomic factors and crime. It reveals:
- A general rise in crime post-2014.
- Urban areas show more intense and variable crime activity.
- Higher income + education correlate with more property crimes.
- Each state exhibits unique crime dynamics.

These insights can support evidence-based policies and guide smarter resource allocation.

---
## Shopping Behavior & Tableau Dashboard Analysis (STAT112 Term Project — 2023)
![Introduction Image for STAT112 Term Tableau Report](/images/STAT112ReportBanner.png)

**Course:** STAT112 — Introductory Data Visualization Term Tableau Project  
**University:** Middle East Technical University (METU)  
**Submission Date:** April 12, 2023  
**Author:** Burak Şahin Küçük  
**Download the full report:** [Click here to view the DOCX](https://docs.google.com/document/d/1eITgmF28Fo7sfCxB0WpGV8b5Jo-_rAxo/edit?usp=sharing&ouid=117838242683814174498&rtpof=true&sd=true)  
**Tableau Dashboard:** [Access Main Dashboard](https://public.tableau.com/app/profile/burak.k.k/viz/OverviewofShoppingBehaviourHabitsandDataFinalRevised1_0/OverviewofShoppingBehaviourHabitsandData#1)

### Project Overview

This report explores customer shopping behavior using a real-world dataset from a nationwide company. The main aim was to create visual insights using **Tableau**, focusing on seasonality, payment preferences, product features, shipping habits, and loyalty indicators. The project includes dashboards designed for both desktop and mobile viewing.


### Dataset Summary

- **Observations:** 3,900
- **Variables:** 17 (4 numerical, 13 categorical)
- **Numerical Variables:** Age, Purchase Amount, Review Rating, Previous Purchases
- **Categorical Variables:** Gender, Item Purchased, Category, Color, Season, Subscription, Shipping Type, Payment Method, Location, and more


### Data Preprocessing in Tableau

- Renamed variables (removed dots for readability)
- Cleaned duplicate entries and fixed missing values
- Re-mapped location and country columns (adjusted from Turkey → United States)
- Combined geographic fields for state-level visualization
- Removed problematic variables with constant values (e.g., Promo Code = Discount Applied)


### Key Research Questions & Insights

1. **What products sell best in each season?**  
   → Top 6 items stay consistent (e.g., Sunglasses, Pants, Jewelry). Sales rank changes per season.

2. **Which states generate the most revenue and prefer which payment methods?**  
   → PayPal dominates in 18 states. California, Illinois, and Montana bring the most revenue.

3. **Does product color influence spending?**  
   → Customers spend more on green, gray, white, and teal items. Teal had the largest variance.

4. **What category-size combinations bring in the most sales?**  
   → Medium-size items and clothing category dominate. XL size and outerwear had the lowest revenue.

5. **What does age distribution reveal about shipping preferences?**  
   → Older people prefer express delivery. Young people use 2-day shipping more.

6. **Do male subscribers shop more often?**  
   → Yes, especially bi-weekly and monthly users. Subscribed males showed greater purchase loyalty.

7. **Montana Medium-Size Clothes: How do they pay?**  
   → Cash is dominant. Credit cards are least used. Suggests cash-preferred culture.

8. **What products should be discontinued in Indiana if downsizing?**  
   → Dresses, hoodies, and backpacks generated no or low revenue and could be phased out.


### Discussion & Tools Used

- Created 2 dashboards: one optimized for desktop, one for mobile
- Focused on clarity and filtering options
- Used Tableau Public, Figma, Word, Grammarly, DeepL
- Fonts: Open Sauce Sans, Manrope, Bower  
- Color Palette: McKinsey New Look

---

### Conclusion

This project demonstrates how visualization can reveal critical customer behavior patterns. It provided actionable insights for:

- Inventory decisions based on product size and season
- Loyalty campaigns tied to subscription frequency
- Targeted regional strategies for payment partners (e.g., PayPal)
- Shipping offers based on customer age demographics

---

