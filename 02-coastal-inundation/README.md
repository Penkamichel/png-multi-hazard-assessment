# Coastal Inundation Exposure Assessment for Papua New Guinea

## Project Overview

This project analyzes population exposure to coastal inundation in Papua New Guinea (PNG) using elevation-based modeling at Local-Level Government (LLG) and provincial levels. 

**Primary Purpose**: Support project planning and resource allocation by enabling **inter-provincial comparison of hazard exposure**. Results inform decisions on which provinces to prioritize for coastal resilience interventions, climate adaptation programs, and disaster risk reduction initiatives.

### Key Findings
- **414,808 people** exposed in low-elevation coastal zones (≤10m elevation)
- **326 LLGs** analyzed across 22 provinces
- **Top 5 highest-exposure provinces**:
  1. Gulf Province – 29.5%
  2. Manus Province – 28.1%
  3. Milne Bay Province – 21.2%
  4. Central Province – 16.4%
  5. Western Province – 14.4%


---

## Data Sources

### Elevation Data
**Source**: [Shuttle Radar Topography Mission (SRTM)](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1)

**Background**:
- NASA collected radar data during an 11-day space shuttle mission in February 2000
- Produced near-global digital elevation models (DEMs)

**Specifications**:
- Spatial resolution: 1 arc-second (~30 meters)
- Vertical accuracy: ±16m absolute, ±6m relative
- Coverage: Global (60°N - 56°S)
- Provides detailed topographic information for identifying low-lying coastal areas

**Application**:
- Identifies areas ≤10m above sea level, representing coastal flood risk zones
- The 10m threshold follows IPCC and UN-Habitat conventions for Low-Elevation Coastal Zone (LECZ) definition

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

1. **Flood Risk Area Identification**
   - Used SRTM elevation data to identify areas below 10 meters
   - Created binary mask representing coastal inundation risk zones

2. **Population Estimation**
   - Calculated total population (from HRSL) for each LLG
   - Calculated population within coastal inundation zones (≤10m) for each LLG

3. **Risk Metrics Computation**
   - **Exposure Ratio**: Population in coastal areas / Total LLG population
   - **Exposure Density**: Population in coastal areas / Coastal area (km²)
   - **Coastal Area**: Total extent of LECZ per LLG (km²)

4. **Provincial Aggregation**
   - Aggregated LLG-level metrics to provincial level for comparative ranking
   - Calculated provincial exposure ratios and total exposed populations

### Key Metrics

| Metric | Definition | Use for Inter-Provincial Comparison |
|--------|------------|-------------------------------------|
| **Exposed Population** | Population in areas ≤10m elevation | Identify provinces with highest absolute exposure |
| **Exposure Ratio** | Proportion of provincial population in LECZ | Compare relative vulnerability (normalized by population) |
| **Exposure Density** | Population density within LECZ (people/km²) | Assess concentration of exposure in coastal zones |

## Result Map
<img width="1279" height="820" alt="image" src="https://github.com/user-attachments/assets/8cc9eefd-8ff7-4359-860f-4a6cc18cbe92" />
---

## Important Limitations

### What This Analysis IS
- **Population exposure analysis**: Shows how many people live in low-lying coastal areas
- **Provincial screening tool**: Enables comparison and prioritization across 22 provinces
- **Strategic planning input**: Supports project design and resource allocation decisions

### What This Analysis IS NOT
- **Comprehensive risk analysis**: Does not evaluate vulnerability or hazard intensity
- **Precise flood modeling**: Does not include:
  - Storm surge dynamics
  - Tidal variations
  - Wave run-up
  - Coastal erosion patterns
  - Sea level rise projections
- **Infrastructure assessment**: Does not account for:
  - Coastal protection (seawalls, mangroves)
  - Drainage systems
  - Local flood defenses
  - Building resilience

### Data Quality Considerations

**SRTM Elevation Accuracy**:
- Vertical accuracy: ±16m absolute error
- **Critical implication**: At 10m threshold, elevation errors significantly affect results
- Reflects land surface in 2000 (20+ years old)
- May include structures (buildings, bridges) rather than bare earth

**Population Data Limitations**:
- Static estimates (does not reflect seasonal migration or daily movements)
- Temporal lag (5-10 years old)
- 30m resolution may miss fine-scale settlement patterns

**Aggregate Analysis**:
- Results presented at LLG and provincial levels
- May mask ward-level or village-level variations within provinces
- High-exposure wards within low-exposure LLGs may be overlooked

### Interpretation Guidance

**Use this analysis for**:
- Comparing relative exposure across provinces to prioritize project locations
- Initial screening to identify high-exposure provinces for further investigation
- Strategic resource allocation decisions
- Baseline data for project proposals and funding applications

**Do NOT use for**:
- Site-specific infrastructure planning
- Evacuation route design
- Insurance underwriting
- Legal coastal setback determination

**Recommended follow-up**:
- Conduct detailed assessments in prioritized provinces
- Field validation of exposure estimates
- Integration with socioeconomic vulnerability data
- Consultation with provincial and local governments

---

## Technical Implementation

### Platform
- **Google Earth Engine (GEE)**: Cloud-based geospatial processing
- **Language**: JavaScript (Earth Engine API)
- **Computational scale**: >10¹³ pixels processed
- **Spatial resolution**: 30 meters (maintained throughout)

### Performance Optimizations
- Multi-band image processing (3x faster than sequential operations)
- Tile-based computation (tileScale: 4) for memory efficiency
- Null-safe operations and zero-division protection

### Code Features
- Modular, reusable functions
- Configuration-driven parameters
- Professional JSDoc documentation
- Reproducible workflow

---

## Results

### National Summary
- **Total Population**: 10~ million
- **Exposed Population**: 414,808 (4.1%)
- **Provinces Analyzed**: 22

### Provincial Rankings by Exposure Ratio

| Rank | Province | Exposure Ratio | Exposed Population | Implication for Project Planning |
|------|----------|----------------|-------------------|----------------------------------|
| 1 | Gulf | 29.5% | ~41,000 | **Highest priority**: Nearly 1 in 3 residents in LECZ |
| 2 | Manus | 28.1% | ~16,000 | **High priority**: Island province with limited alternatives |
| 3 | Milne Bay | 21.2% | ~57,000 | **High priority**: Largest exposed population in top 5 |
| 4 | Central | 16.4% | ~44,000 | **Medium-high priority**: Proximity to capital Port Moresby |
| 5 | Western | 14.4% | ~28,000 | **Medium priority**: Large land area, moderate exposure |

### Outputs
- **LLG-level CSV**: 326 records with population, area, and exposure metrics
- **Provincial CSV**: 22 records with aggregated statistics and rankings
- **Interactive map**: Choropleth visualization with dynamic legend
- **GEE Script**: Fully documented, reproducible code

---

## Applications for Project Planning

### Province Selection and Prioritization
- **Initial screening**: Identify provinces with >20% exposure ratio
- **Resource allocation**: Scale interventions based on exposed population
- **Geographic targeting**: Balance between relative exposure and absolute numbers
- **Equity considerations**: Ensure small provinces (e.g., Manus) not overlooked

### Project Design Inputs
- **Baseline data**: Pre-intervention exposure levels for monitoring and evaluation
- **Targeting criteria**: Define eligibility thresholds for provincial participation
- **Budget planning**: Estimate resources needed based on exposed populations
- **Stakeholder engagement**: Identify provinces requiring consultation

### Complementary Analyses Needed
For final province selection, combine this exposure analysis with:
- Socioeconomic vulnerability (poverty, infrastructure access)
- Existing coastal protection infrastructure
- Provincial government capacity and commitment
- Co-benefits with other development objectives
- Accessibility and implementation feasibility

---

## Future Enhancements

### Immediate Next Steps (for shortlisted provinces)
1. **Field validation**: Ground-truth exposure estimates in top 5 provinces
2. **Detailed mapping**: Higher resolution analysis at ward/village level
3. **Infrastructure inventory**: Map existing coastal protection measures
4. **Community consultation**: Validate findings with local knowledge

### Medium-term Improvements
1. **Sea Level Rise Integration**: Model future exposure under IPCC scenarios
2. **Multi-threshold Analysis**: Test sensitivity at 5m, 10m, 15m elevations
3. **Vulnerability Integration**: Overlay socioeconomic data for composite risk index
4. **Hydrodynamic Modeling**: Storm surge analysis for priority provinces


---

## Acknowledgments

- **USGS EROS**: SRTM elevation data (public domain)
- **Meta/CIESIN**: High Resolution Settlement Layer (CC BY 4.0)
- **Google Earth Engine**: Cloud computing platform
- **PNG National Statistical Office**: Administrative boundary data

---

## License

- **Code**: MIT License
- **SRTM Data**: Public domain (USGS)
- **HRSL Data**: CC BY 4.0

---
