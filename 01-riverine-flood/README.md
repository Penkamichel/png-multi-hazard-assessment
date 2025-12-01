# Climate-Informed Flood Risk Assessment for Papua New Guinea

## Project Overview
This project provides a comprehensive geospatial analysis of riverine flood exposure in Papua New Guinea (PNG) at the Local-Level Government (LLG) and provincial levels. Using high-resolution population data and climate-driven flood projections under RCP 8.5 scenarios, the analysis identifies vulnerable populations and quantifies exposure metrics.

**Primary Purpose**: Support project planning and resource allocation by enabling **inter-provincial comparison of riverine flood exposure**. Results inform decisions on which provinces to prioritize for flood mitigation infrastructure, early warning systems, and climate adaptation programs.

### Key Findings
- **660,607** people exposed to riverine flood risk nationally (25-year return period, 2030)  
- **326** LLGs analyzed across all provinces  
- **Top 5 highest-exposure provinces:**  
  1. Madang (37.8%)  
  2. East Sepik (27.8%)  
  3. Gulf (23.5%)  
  4. Western (16.4%)  
  5. West New Britain (16.2%)
 


---

## Data Sources

### Flood Hazard Data
**Source:** Aqueduct Floods Hazard Maps (World Resources Institute, WRI)  
**Specifications:**  
- Quantitative flood risk data for current and future climate scenarios  
- Historical calibration: 1960–1999  
- Based on multi-model GCM ensemble  
- Climate scenarios: RCP 4.5 & RCP 8.5  
- **Scenario used:** RCP 8.5 (2030), 25-year return period  

### Population Data
**Source:** High Resolution Settlement Layer (HRSL) – Meta/CIESIN  
**Specifications:**  
- Spatial resolution: **30 m**  
- ML-based population disaggregation  
- Full PNG coverage  

### Administrative Boundaries
**Source:** PNG Local-Level Government (LLG) boundaries  
- 326 LLGs across 22 provinces  
- Consistent hierarchical structure (LLG → Province → National)

---

## Methodology

### Analysis Workflow
1. **Data Acquisition and Preprocessing**
   - Load flood depth projections (RCP 8.5, 2030)
   - Mosaic HRSL tiles
   - Load LLG boundaries

2. **Flood Mask Generation**
   - Binary mask: pixels with flood depth > 0
   - Resolution: 30 m

3. **Population Exposure Calculation**
   - Overlay hazard mask with HRSL population rasters
   - Zonal statistics at LLG scale

4. **Risk Metrics Computation**
   - *Exposed Population*  
   - *Exposure Ratio*  
   - *Exposure Density*  
   - *Flood Area*

5. **Multi-Level Aggregation**
   - LLG-level indicators  
   - Provincial summaries  
   - National totals  

### Key Metrics
| Metric | Definition |
|--------|------------|
| **Exposed Population** | People living within flood-affected pixels |
| **Exposure Ratio** | Exposed population ÷ Total LLG population |
| **Exposure Density** | Exposed population ÷ Flood area (km²) |
| **Flood Area** | Σ flooded pixels × 900 m² |


---

## Technical Implementation

## Platform
- **Google Earth Engine (GEE)** – JavaScript API  
- Computational scale: **>10¹³ pixels**

## Features
- Robust null handling  
- Zero-division safeguards  
- Modular, scalable codebase for multi-country reuse  
- JSDoc-style documentation  

---

## Results

### National Summary
- **Total population analyzed:** 10~ million  
- **Exposed population:** 660,607  
- **National exposure ratio:** ~6.6%  

### Provincial Rankings (Top 5)

| Rank | Province          | Exposure Ratio | Exposed Population |
|------|------------------|----------------|--------------------|
| 1    | Madang           | 37.8%          | ~143,000           |
| 2    | East Sepik       | 27.8%          | ~118,000           |
| 3    | Gulf             | 23.5%          | ~31,000            |
| 4    | Western          | 16.4%          | ~26,000            |
| 5    | West New Britain | 16.2%          | ~42,000            |

### Outputs
- **CSV:** 326 LLG records  
- **CSV:** 22 provincial records  
- **Maps:** Choropleths of flood exposure  
- **Legend panels:** dynamic top-province ranking  

### Result Map
<img width="1275" height="865" alt="image" src="https://github.com/user-attachments/assets/da1c172f-34dd-47ed-8689-1f22d087aa33" />


---

## Limitations

### Model Assumptions
Flood hazard models may not capture:
- Local micro-topography  
- Small-scale water infrastructure  
- Existing flood defenses  
- Variations in flood depths  

### Data Constraints
- HRSL represents a **static period (2015–2020)**  
- Does not reflect transient or migratory population patterns  
- Climate scenarios are **probabilistic**, not predictive  

### Spatial Resolution
- 30m resolution may not capture:  
  - small settlements  
  - localized hazards  
  - micro-topographic features  

### Interpretation
These results should be used for **strategic planning**, not fine-scale engineering design.  
Ground-truthing and local validation are recommended for operational decisions.

---

## Potential Applications
- Disaster risk reduction (DRR) prioritization  
- Climate adaptation planning and policy support  
- Humanitarian logistics & resource pre-positioning  
- Vulnerability and exposure assessments  
- Climate finance proposal evidence generation  

### Scalability
The analytical workflow can be adapted for:
- Other Pacific Island or developing countries  
- Other hazards (coastal flooding, landslides, drought)  
- Other climate scenarios (RCP 4.5, SSPs)  
- Other time horizons (2030, 2050, 2080)

 

---

## Acknowledgments
- World Resources Institute (WRI) – Aqueduct Floods  
- Meta/CIESIN – High Resolution Settlement Layer (HRSL)  
- Google Earth Engine – Platform and computational support  

---

## License
This project is shared for portfolio demonstration.  
Data sources retain their original licenses:

- **HRSL:** CC BY 4.0  
- **WRI Aqueduct:** CC BY 4.0  
- **Code:** MIT License  

_Last updated: December 2024_
