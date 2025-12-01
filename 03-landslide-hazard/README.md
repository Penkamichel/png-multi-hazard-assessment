# Landslide Hazard Exposure Assessment for Papua New Guinea

## Project Overview

This project analyzes population exposure to landslide hazards in Papua New Guinea (PNG) using multi-trigger susceptibility models at Local-Level Government (LLG) and provincial levels.

**Primary Purpose**: Support project planning and resource allocation by enabling **inter-provincial comparison of landslide exposure**. Results inform decisions on which provinces to prioritize for slope stabilization programs, land use planning interventions, and disaster risk reduction initiatives in mountainous areas.

### Key Findings
- **749,133 people** exposed to low landslide risk
- **707,992 people** exposed to medium landslide risk
- **31,774 people** exposed to high landslide risk
- **599 people** exposed to very high landslide risk
- **326 LLGs** analyzed across 22 provinces
- **Top 5 provinces by average risk score**:
  1. Chimbu (Simbu) Province – 4.77
  2. Jiwaka Province – 4.58
  3. Morobe Province – 4.13
  4. Enga Province – 4.02
  5. Hela Province – 3.69



---

## Data Sources

### Landslide Hazard Data
**Source**: [International Centre for Geohazards (NGI)](https://www.ngi.no/) Global Landslide Hazard Map

**Background**:
- Global-scale landslide susceptibility model
- Estimates annual frequency of landslides triggered by earthquakes and precipitation

**Methodology**:
- Risk modeled based on six susceptibility factors:
  1. **Slope**: Terrain gradient analysis
  2. **Geological/lithological conditions**: Rock type and structure
  3. **Soil moisture**: Saturation levels affecting stability
  4. **Vegetation cover**: Root reinforcement and land use
  5. **Precipitation patterns**: Rainfall intensity and duration
  6. **Seismic conditions**: Earthquake frequency and magnitude
- Output: Expected annual probability of destructive landslides, scaled by pixel percentage occurrence

**Specifications**:
- **Triggers**: Earthquake-induced and precipitation-induced landslides analyzed separately
- **Risk Scale**: 1-8 scale representing annual frequency/probability
- **Coverage**: Global

### Data Integration Approach
- **Multi-trigger analysis**: Earthquake and precipitation hazards integrated by taking **maximum value** per pixel
- **Rationale**: Conservative approach captures highest hazard from either trigger mechanism
- **Reclassification**: 8-level hazard scale reclassified into 4 operational risk levels:
  - **Low (1)**: Original levels 1-2
  - **Medium (2)**: Original levels 3-4
  - **High (3)**: Original levels 5-6
  - **Very High (4)**: Original levels 7-8

### Population Data
**Source**: [High Resolution Settlement Layer (HRSL)](https://data.humdata.org/dataset/highresolutionpopulationdensitymaps) - Meta/CIESIN

**Specifications**:
- Spatial resolution: 30 meters
- Methodology: Machine learning-based population disaggregation using satellite imagery
- Temporal baseline: circa 2015-2020

### Administrative Boundaries
**Source**: PNG Local-Level Government (LLG) boundaries
- 326 LLGs across 22 provinces
- Used for spatial aggregation and comparative analysis

---

## Methodology

### Analysis Workflow

1. **Dataset Integration**
   - Loaded earthquake and precipitation-triggered landslide risks
   - Integrated by taking maximum value per pixel (conservative approach)

2. **Reclassification**
   - Converted 8-level risk scale to 4 operational levels (Low, Medium, High, Very High)
   - Simplifies interpretation while preserving risk gradients

3. **Population Analysis**
   - Overlaid High-Resolution Settlement Layer (HRSL) population dataset onto reclassified risk map
   - Calculated population exposed to each risk level for each LLG

4. **Scoring**
   - Computed LLG-level risk scores as weighted average:
     ```
     Risk Score = (Low × 1) + (Medium × 2) + (High × 3) + (Very High × 4)
     ```
   - Normalized to 1-4 scale based on population proportions in each risk level

5. **Provincial Aggregation**
   - Averaged LLG risk scores within each province for comparative analysis
   - Calculated total exposed populations by risk level

### Key Metrics

| Metric | Definition | Use for Inter-Provincial Comparison |
|--------|------------|-------------------------------------|
| **Exposed Population (by level)** | Population within each risk zone | Identify provinces with most people in high/very high risk |
| **Risk Score** | Weighted average exposure (1-4 scale) | Compare overall landslide exposure across provinces |
| **Provincial Avg Risk Score** | Mean LLG risk scores in province | Rank provinces for prioritization |


## Result Map
<img width="1277" height="880" alt="image" src="https://github.com/user-attachments/assets/0483d07b-abf5-4b73-9ce2-f98c21820364" />
---

## Important Limitations

### What This Analysis IS
- **Population exposure analysis**: Shows how many people live in landslide-prone areas
- **Provincial screening tool**: Enables comparison and prioritization across 22 provinces
- **Strategic planning input**: Supports project design and resource allocation decisions

### What This Analysis IS NOT
- **Comprehensive risk analysis**: Does not evaluate vulnerability or capacity factors
- **Site-specific assessment**: Does not include:
  - Local geological surveys
  - Historical landslide inventories
  - Detailed slope stability analysis
  - Infrastructure vulnerability mapping
  - Early warning system coverage
- **Validated for PNG**: Global model not calibrated with PNG-specific data

### Data Quality Considerations

**Global Data Limitations**:
- Dataset uses global-scale models which might not fully reflect:
  - Local microclimates (orographic precipitation, valley winds)
  - Localized geological variations (fault zones, soil types not in global databases)
  - Fine-scale topographic features (gullies, scarps <30m resolution)
  - Recent land use changes (deforestation, mining, road construction)

**Exposure Does Not Equal Risk**:
- Map shows exposure but does not account for:
  - **Vulnerability factors**: Building quality, infrastructure resilience, early warning systems
  - **Capacity factors**: Evacuation plans, emergency response capability, community preparedness
  - **Coping mechanisms**: Traditional knowledge, social networks, livelihood diversification

**Temporal Resolution**:
- Model assumes static conditions and does not account for:
  - Seasonal vegetation changes (dry season vs. wet season)
  - Land-use transitions (forest conversion, urban expansion)
  - Climate change trends (shifting precipitation patterns, extreme event frequency)

**Population Data Limitations**:
- Static snapshot (circa 2015-2020)
- Does not capture seasonal migration, diurnal movements, or recent demographic shifts

**Aggregate Analysis**:
- Results presented at LLG and provincial levels
- May mask ward-level or village-level variations
- High-risk wards within low-risk LLGs may be overlooked

### Interpretation Guidance

**Use this analysis for**:
- Comparing relative landslide exposure across provinces to prioritize project locations
- Initial screening to identify high-exposure provinces for further investigation
- Strategic resource allocation for slope stabilization and land use planning
- Baseline data for project proposals targeting mountainous regions

**Do NOT use for**:
- Site-specific engineering (infrastructure design, slope stability)
- Land-use permitting without ground surveys
- Insurance underwriting
- Evacuation routing without detailed terrain analysis

**Recommended follow-up**:
- Conduct local geological surveys in prioritized provinces
- Compile historical landslide inventories
- Field validation with community-based risk mapping
- High-resolution terrain analysis (LiDAR, drones) for priority areas

---

## Technical Implementation

### Platform
- **Google Earth Engine (GEE)**: Cloud-based geospatial processing
- **Language**: JavaScript (Earth Engine API)
- **Computational scale**: >10¹³ pixels processed
- **Spatial resolution**: 30 meters (maintained throughout)

### Performance Optimizations
- Multi-band image processing (5x faster than sequential operations)
- Single reduceRegion call per LLG (instead of 5 separate calls)
- Tile-based computation (tileScale: 4) for memory efficiency
- Null-safe operations and zero-division protection

### Code Features
- Modular, reusable functions
- Configuration-driven parameters
- Multi-trigger hazard integration
- Professional JSDoc documentation
- Reproducible workflow

---

## Results

### National Summary
- **Total Population**: 10~ million
- **Low Risk**: 749,133 people (7.5%)
- **Medium Risk**: 707,992 people (7.1%)
- **High Risk**: 31,774 people (0.3%)
- **Very High Risk**: 599 people (<0.1%)
- **Total Exposed**: ~1.49 million people (16.6%)

### Provincial Rankings by Average Risk Score

| Rank | Province | Avg Risk Score |
|------|----------|----------------|
| 1 | Chimbu (Simbu) | 4.77 |
| 2 | Jiwaka | 4.58 |
| 3 | Morobe | 4.13 |
| 4 | Enga | 4.02 |
| 5 | Hela | 3.69 |

**Note**: Risk scores range from 0 (no exposure) to 4 (maximum weighted exposure). Highlands provinces (Chimbu, Jiwaka, Enga, Hela) dominate top rankings due to steep terrain and high seismic/precipitation triggers.

### Outputs
- **LLG-level CSV**: 326 records with population by risk level and risk scores
- **Provincial CSV**: 22 records with average risk scores and total exposed populations
- **Interactive map**: Choropleth visualization showing risk scores
- **GEE Script**: Fully documented, reproducible code

---

## Applications for Project Planning

### Province Selection and Prioritization
- **Initial screening**: Identify provinces with average risk score >4.0
- **Targeting criteria**: Balance between risk score and exposed population
- **Geographic focus**: Highlands provinces show highest landslide exposure
- **Sectoral integration**: Consider co-location with mining, agriculture, infrastructure projects

### Project Design Inputs
- **Baseline data**: Pre-intervention exposure levels for monitoring and evaluation
- **Intervention targeting**: Focus on High/Very High risk areas within priority provinces
- **Budget planning**: Estimate resources based on exposed populations and terrain complexity
- **Stakeholder engagement**: Identify provinces requiring consultation and capacity building

### Complementary Analyses Needed
For final province selection, combine this exposure analysis with:
- Infrastructure vulnerability (roads, schools, hospitals in landslide zones)
- Economic activity concentration (mining, agriculture, tourism)
- Historical landslide events and impacts
- Provincial government capacity and commitment
- Accessibility and implementation feasibility

---

## Future Enhancements

### Immediate Next Steps (for shortlisted provinces)
1. **Field validation**: Ground-truth exposure estimates in top 5 provinces
2. **Historical inventory**: Compile records of past landslide events
3. **Community mapping**: Participatory risk assessment with local knowledge
4. **Infrastructure assessment**: Map critical facilities in high-risk zones

### Medium-term Improvements
1. **Local Validation**: Calibrate global model with PNG-specific landslide inventory
2. **Temporal Dynamics**: Integrate rainfall forecasts for early warning
3. **Vulnerability Integration**: Overlay infrastructure and socioeconomic data
4. **Multi-Hazard Analysis**: Combine with earthquake, flood hazards for compound risks


---

## Acknowledgments

- **International Centre for Geohazards (NGI)**: Global landslide hazard data
- **Meta/CIESIN**: High Resolution Settlement Layer (CC BY 4.0)
- **Google Earth Engine**: Cloud computing platform
- **PNG National Statistical Office**: Administrative boundary data

---

## License

- **Code**: MIT License
- **NGI Data**: [Check NGI data policy]
- **HRSL Data**: CC BY 4.0

---
