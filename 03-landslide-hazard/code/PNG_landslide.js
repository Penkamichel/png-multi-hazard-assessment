/**
 * ============================================================================
 * LANDSLIDE HAZARD EXPOSURE ASSESSMENT FOR PAPUA NEW GUINEA
 * ============================================================================
 * 
 * Purpose: Analyze population exposure to landslide hazards at LLG 
 *          (Local-Level Government) and provincial levels using multi-trigger
 *          landslide susceptibility data and high-resolution population.
 * 
 * Data Sources:
 *   - NGI Landslide Hazard: Earthquake and precipitation-triggered susceptibility
 *   - HRSL (High Resolution Settlement Layer): Population distribution
 *   - Administrative boundaries: LLG and provincial levels
 * 
 * Key Metrics:
 *   - Exposed Population by Risk Level: Low, Medium, High, Very High
 *   - Risk Score: Weighted population exposure (1-4 scale)
 *   - Provincial Average Risk Score: Comparative metric across provinces
 * 
 * Methodology Note:
 *   Landslide susceptibility is based on global models considering slope,
 *   geology, soil moisture, vegetation, precipitation, and seismic conditions.
 *   Results represent annual probability of occurrence and should be validated
 *   with local geological surveys and historical landslide inventories.
 * 
 * Date: December 2024
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

var CONFIG = {
  // Asset paths
  assetPaths: {
    landslide_PR: 'projects/sample-task-app-0nnek4/assets/landslide_PR',
    landslide_EQ: 'projects/sample-task-app-0nnek4/assets/LandSlide_EQ',
    llg_boundaries: 'projects/sample-task-app-0nnek4/assets/PNG_LLG'
  },
  
  // Analysis parameters
  scale: 100,                   // Spatial resolution
  maxPixels: 1e13,              // Maximum pixels for computation
  tileScale: 4,                 // Use larger tiles to reduce memory errors
  
  // Risk classification thresholds (1-8 scale from NGI data)
  riskLevels: {
    low: {min: 1, max: 2},
    medium: {min: 3, max: 4},
    high: {min: 5, max: 6},
    veryHigh: {min: 7, max: 8}
  },
  
  // Risk scoring weights
  riskWeights: {
    low: 1,
    medium: 2,
    high: 3,
    veryHigh: 4
  },
  
  // Visualization parameters
  populationMax: 500,
  
  // Color palettes
  palettes: {
    population: ['red'],
    riskScore: ['#ffffff00', '#f7f3e6', '#e7d8c6', '#d9bca6', '#cc9f86', 
                '#bf8266', '#b46546', '#a84826', '#8e3c20', '#6e2e17'],
    detailedRisk: ['#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', 
                   '#41ab5d', '#238b45', '#006d2c', '#00441b'],
    fourLevel: ['#ffffcc', '#ffeda0', '#f03b20', '#bd0026']
  },
  
  // Export settings
  exportFolder: 'EarthEngineExports',
  exportDescriptions: {
    llg: 'PNG_LLG_Landslide_Risk_Analysis',
    province: 'PNG_Province_Landslide_Risk_Summary'
  }
};

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load country boundary for Papua New Guinea
 * @return {ee.FeatureCollection} PNG boundary
 */
function loadCountryBoundary() {
  var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
  return countries.filter(ee.Filter.eq('country_na', 'Papua New Guinea'));
}

/**
 * Load high-resolution population data
 * @param {ee.Geometry} region - Study area geometry
 * @return {ee.Image} Population distribution image
 */
function loadPopulationData(region) {
  return ee.ImageCollection("projects/sat-io/open-datasets/hrsl/hrslpop")
    .filterBounds(region)
    .mosaic()
    .clip(region);
}

/**
 * Load landslide hazard data (precipitation and earthquake triggers)
 * @param {ee.Geometry} region - Study area geometry
 * @return {Object} Object containing precipitation and earthquake hazard images
 */
function loadLandslideData(region) {
  var precipitationHazard = ee.Image(CONFIG.assetPaths.landslide_PR)
    .clip(region);
  var earthquakeHazard = ee.Image(CONFIG.assetPaths.landslide_EQ)
    .clip(region);
  
  return {
    precipitation: precipitationHazard,
    earthquake: earthquakeHazard
  };
}

/**
 * Load administrative boundaries (LLG level)
 * @return {ee.FeatureCollection} LLG boundaries
 */
function loadAdministrativeBoundaries() {
  return ee.FeatureCollection(CONFIG.assetPaths.llg_boundaries);
}

// Initialize data
var png = loadCountryBoundary();
var HRSL_general = loadPopulationData(png.geometry());
var landslideData = loadLandslideData(png.geometry());
var llg_boundaries = loadAdministrativeBoundaries();

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Mask landslide hazard data to valid risk levels (1-8)
 * @param {ee.Image} image - Landslide hazard image
 * @return {ee.Image} Masked hazard image
 */
function maskValidRiskLevels(image) {
  var mask = image.gte(1).and(image.lte(8));
  return image.updateMask(mask);
}

/**
 * Combine earthquake and precipitation hazards using maximum value
 * @param {ee.Image} earthquakeHazard - Earthquake-triggered hazard
 * @param {ee.Image} precipitationHazard - Precipitation-triggered hazard
 * @return {ee.Image} Combined hazard (maximum of both triggers)
 */
function combineLandslideHazards(earthquakeHazard, precipitationHazard) {
  var maskedEQ = maskValidRiskLevels(earthquakeHazard);
  var maskedPR = maskValidRiskLevels(precipitationHazard);
  
  return maskedEQ.max(maskedPR);
}

/**
 * Reclassify 8-level risk to 4-level risk (Low, Medium, High, Very High)
 * @param {ee.Image} image - 8-level risk image
 * @return {ee.Image} 4-level reclassified risk image
 */
function reclassifyRisk(image) {
  return image
    .where(image.gte(1).and(image.lte(2)), 1)  // Low
    .where(image.gte(3).and(image.lte(4)), 2)  // Medium
    .where(image.gte(5).and(image.lte(6)), 3)  // High
    .where(image.gte(7).and(image.lte(8)), 4)  // Very High
    .rename('Risk_Level');
}

/**
 * Create population exposure images for each risk level
 * @param {ee.Image} population - Population distribution
 * @param {ee.Image} riskMap - Reclassified risk map (1-4)
 * @return {Object} Population images by risk level
 */
function createRiskPopulationLayers(population, riskMap) {
  return {
    low: population.updateMask(riskMap.eq(1)),
    medium: population.updateMask(riskMap.eq(2)),
    high: population.updateMask(riskMap.eq(3)),
    veryHigh: population.updateMask(riskMap.eq(4))
  };
}

/**
 * Safe reducer operation with null handling
 * @param {ee.Image} image - Input image
 * @param {ee.Geometry} geometry - Region of interest
 * @param {string} bandName - Band name to extract
 * @return {ee.Number} Reduced value (0 if null)
 */
function safeSum(image, geometry, bandName) {
  var result = image.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geometry,
    scale: CONFIG.scale,
    maxPixels: CONFIG.maxPixels,
    bestEffort: true
  });
  
  var value = result.get(bandName);
  return ee.Number(ee.Algorithms.If(value, value, 0));
}

/**
 * Calculate landslide risk metrics for each LLG (Optimized version)
 * Uses a single multi-band image to reduce computation time
 * 
 * @param {ee.FeatureCollection} boundaries - LLG boundaries
 * @param {ee.Image} population - Population image
 * @param {ee.Image} riskMap - Reclassified risk map (1-4)
 * @return {ee.FeatureCollection} LLG statistics
 */
function calculateLLGStatistics(boundaries, population, riskMap) {
  // Create a multi-band image with all risk levels
  var multiband = ee.Image([
    population.rename('total_pop'),
    population.updateMask(riskMap.eq(1)).rename('low_pop'),
    population.updateMask(riskMap.eq(2)).rename('medium_pop'),
    population.updateMask(riskMap.eq(3)).rename('high_pop'),
    population.updateMask(riskMap.eq(4)).rename('very_high_pop')
  ]);
  
  return boundaries.map(function(feature) {
    var geometry = feature.geometry();
    
    var stats = multiband.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: CONFIG.scale,
      maxPixels: CONFIG.maxPixels,
      bestEffort: true
    });
    
    // Extract values with null protection
    var totalPop = ee.Number(ee.Algorithms.If(stats.get('total_pop'), stats.get('total_pop'), 0)).round();
    var lowRiskPop = ee.Number(ee.Algorithms.If(stats.get('low_pop'), stats.get('low_pop'), 0)).round();
    var mediumRiskPop = ee.Number(ee.Algorithms.If(stats.get('medium_pop'), stats.get('medium_pop'), 0)).round();
    var highRiskPop = ee.Number(ee.Algorithms.If(stats.get('high_pop'), stats.get('high_pop'), 0)).round();
    var veryHighRiskPop = ee.Number(ee.Algorithms.If(stats.get('very_high_pop'), stats.get('very_high_pop'), 0)).round();
    
    // Safe division for ratios
    var safePop = ee.Algorithms.If(totalPop.gt(0), totalPop, 1);
    
    // Risk ratios
    var lowRiskRatio = lowRiskPop.divide(safePop);
    var mediumRiskRatio = mediumRiskPop.divide(safePop);
    var highRiskRatio = highRiskPop.divide(safePop);
    var veryHighRiskRatio = veryHighRiskPop.divide(safePop);
    
    // Weighted risk score (1-4 scale)
    var riskScore = ee.Number(lowRiskRatio).multiply(CONFIG.riskWeights.low)
      .add(ee.Number(mediumRiskRatio).multiply(CONFIG.riskWeights.medium))
      .add(ee.Number(highRiskRatio).multiply(CONFIG.riskWeights.high))
      .add(ee.Number(veryHighRiskRatio).multiply(CONFIG.riskWeights.veryHigh));
    
    return feature.set({
      'LLG_Population': totalPop,
      'Low_Risk_Population': lowRiskPop,
      'Medium_Risk_Population': mediumRiskPop,
      'High_Risk_Population': highRiskPop,
      'Very_High_Risk_Population': veryHighRiskPop,
      'Low_Risk_Ratio': lowRiskRatio,
      'Medium_Risk_Ratio': mediumRiskRatio,
      'High_Risk_Ratio': highRiskRatio,
      'Very_High_Risk_Ratio': veryHighRiskRatio,
      'Risk_Score': riskScore
    });
  });
}

/**
 * Aggregate LLG statistics to provincial level
 * @param {ee.FeatureCollection} llgStats - LLG-level statistics
 * @return {ee.FeatureCollection} Provincial statistics
 */
function aggregateToProvinceLevel(llgStats) {
  var provinces = llgStats.aggregate_array('ADM1_EN').distinct();
  
  var provinceStats = provinces.map(function(provinceName) {
    var filtered = llgStats.filter(ee.Filter.eq('ADM1_EN', provinceName));
    
    var totalPop = filtered.aggregate_sum('LLG_Population');
    var lowRiskPop = filtered.aggregate_sum('Low_Risk_Population');
    var mediumRiskPop = filtered.aggregate_sum('Medium_Risk_Population');
    var highRiskPop = filtered.aggregate_sum('High_Risk_Population');
    var veryHighRiskPop = filtered.aggregate_sum('Very_High_Risk_Population');
    var totalRiskScore = filtered.aggregate_sum('Risk_Score');
    var llgCount = filtered.size();
    
    // Calculate average risk score
    var avgRiskScore = ee.Algorithms.If(
      ee.Number(llgCount).gt(0),
      ee.Number(totalRiskScore).divide(llgCount),
      0
    );
    
    return ee.Feature(null, {
      'Province': provinceName,
      'Total_Population': totalPop,
      'Low_Risk_Population': lowRiskPop,
      'Medium_Risk_Population': mediumRiskPop,
      'High_Risk_Population': highRiskPop,
      'Very_High_Risk_Population': veryHighRiskPop,
      'Total_Risk_Score': totalRiskScore,
      'Average_Risk_Score': avgRiskScore,
      'LLG_Count': llgCount
    });
  });
  
  return ee.FeatureCollection(provinceStats).sort('Province');
}

/**
 * Calculate national totals by risk level (Optimized version)
 * Uses a single reduceRegion call instead of 4 separate calls
 * 
 * @param {ee.Image} population - Population distribution
 * @param {ee.Image} riskMap - Reclassified risk map (1-4)
 * @param {ee.Geometry} region - Study area
 * @return {Object} National totals by risk level
 */
function calculateNationalRiskTotals(population, riskMap, region) {
  // Create multi-band image for single computation
  var multiband = ee.Image([
    population.updateMask(riskMap.eq(1)).rename('low'),
    population.updateMask(riskMap.eq(2)).rename('medium'),
    population.updateMask(riskMap.eq(3)).rename('high'),
    population.updateMask(riskMap.eq(4)).rename('very_high')
  ]);
  
  // Single reduceRegion call
  var stats = multiband.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: region,
    scale: CONFIG.scale,
    maxPixels: CONFIG.maxPixels,
    bestEffort: true
  });
  
  return {
    low: ee.Number(ee.Algorithms.If(stats.get('low'), stats.get('low'), 0)).round(),
    medium: ee.Number(ee.Algorithms.If(stats.get('medium'), stats.get('medium'), 0)).round(),
    high: ee.Number(ee.Algorithms.If(stats.get('high'), stats.get('high'), 0)).round(),
    veryHigh: ee.Number(ee.Algorithms.If(stats.get('very_high'), stats.get('very_high'), 0)).round()
  };
}

// ============================================================================
// ANALYSIS EXECUTION
// ============================================================================

// Process landslide hazard data
var combinedHazard = combineLandslideHazards(
  landslideData.earthquake,
  landslideData.precipitation
);

var reclassifiedRisk = reclassifyRisk(combinedHazard).clip(png.geometry());

// Calculate statistics (optimized - no need to create separate layers)
var llg_stats = calculateLLGStatistics(
  llg_boundaries,
  HRSL_general,
  reclassifiedRisk  // Pass risk map directly, not pre-masked layers
);

var province_stats = aggregateToProvinceLevel(llg_stats);

var nationalTotals = calculateNationalRiskTotals(
  HRSL_general,
  reclassifiedRisk,  // Pass risk map directly
  png.geometry()
);

// Create risk-stratified population layers ONLY for visualization
var riskPopulationLayers = createRiskPopulationLayers(HRSL_general, reclassifiedRisk);

// ============================================================================
// VISUALIZATION
// ============================================================================

/**
 * Create risk score raster for visualization
 * @param {ee.FeatureCollection} stats - LLG statistics
 * @return {ee.Image} Rasterized risk score
 */
function createRiskScoreRaster(stats) {
  var rasterized = stats.reduceToImage({
    properties: ['Risk_Score'],
    reducer: ee.Reducer.first()
  });
  
  // Mask zero values
  return rasterized.updateMask(rasterized.gt(0));
}

/**
 * Add interactive legend with national totals and top provinces
 * @param {ee.FeatureCollection} llgStats - LLG statistics
 * @param {ee.FeatureCollection} provinceStats - Provincial statistics
 * @param {Object} nationalTotals - National risk totals
 */
function addInteractiveLegend(llgStats, provinceStats, nationalTotals) {
  var legend = ui.Panel({
    style: {position: 'bottom-left', padding: '8px 15px'}
  });
  
  // Title
  legend.add(ui.Label({
    value: 'Landslide Risk Score',
    style: {fontSize: '14px', fontWeight: 'bold'}
  }));
  
  // Color bar
  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '200x20',
      format: 'png',
      min: 0,
      max: 4,
      palette: CONFIG.palettes.riskScore
    },
    style: {stretch: 'horizontal', margin: '0px 8px'}
  });
  legend.add(colorBar);
  
  // Labels
  var labels = ui.Panel({
    widgets: [
      ui.Label('Low', {margin: '4px 0px', fontSize: '12px', textAlign: 'left', stretch: 'horizontal'}),
      ui.Label('High', {margin: '4px 0px', fontSize: '12px', textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  legend.add(labels);
  
  // National totals
  nationalTotals.low.evaluate(function(low) {
    nationalTotals.medium.evaluate(function(medium) {
      nationalTotals.high.evaluate(function(high) {
        nationalTotals.veryHigh.evaluate(function(veryHigh) {
          legend.add(ui.Label({
            value: 'National Population by Risk Level:',
            style: {fontSize: '12px', fontWeight: 'bold', margin: '10px 0 0 0'}
          }));
          legend.add(ui.Label('Low: ' + low.toLocaleString(), {fontSize: '12px'}));
          legend.add(ui.Label('Medium: ' + medium.toLocaleString(), {fontSize: '12px'}));
          legend.add(ui.Label('High: ' + high.toLocaleString(), {fontSize: '12px'}));
          legend.add(ui.Label('Very High: ' + veryHigh.toLocaleString(), {fontSize: '12px'}));
          
          // Top 5 provinces
          var top5 = provinceStats.sort('Average_Risk_Score', false).limit(5);
          
          legend.add(ui.Label({
            value: 'Top 5 Provinces by Average Risk Score:',
            style: {fontSize: '12px', fontWeight: 'bold', margin: '10px 0 0 0'}
          }));
          
          top5.evaluate(function(fc) {
            if (fc && fc.features) {
              fc.features.forEach(function(feature, index) {
                var name = feature.properties.Province;
                var score = feature.properties.Average_Risk_Score;
                legend.add(ui.Label(
                  (index + 1) + '. ' + name + ': ' + score.toFixed(2),
                  {fontSize: '12px', margin: '2px 0 0 0'}
                ));
              });
            }
          });
        });
      });
    });
  });
  
  Map.add(legend);
}

// Initialize map
Map.centerObject(png);

// Add map layers
Map.addLayer(
  llg_boundaries.style({color: 'gray', width: 0.5, fillColor: '00000000'}),
  {},
  'LLG Boundaries'
);

Map.addLayer(
  HRSL_general,
  {palette: CONFIG.palettes.population, min: 0, max: CONFIG.populationMax},
  'Population Distribution',
  false
);

Map.addLayer(
  reclassifiedRisk,
  {min: 1, max: 4, palette: CONFIG.palettes.fourLevel},
  'Landslide Risk (4 Levels)',
  false
);

Map.addLayer(
  maskValidRiskLevels(landslideData.precipitation),
  {min: 1, max: 8, palette: CONFIG.palettes.detailedRisk},
  'Landslide Risk (Precipitation)',
  false
);

Map.addLayer(
  maskValidRiskLevels(landslideData.earthquake),
  {min: 1, max: 8, palette: CONFIG.palettes.detailedRisk},
  'Landslide Risk (Earthquake)',
  false
);

var riskScoreRaster = createRiskScoreRaster(llg_stats);
Map.addLayer(
  riskScoreRaster,
  {min: 0, max: 4, palette: CONFIG.palettes.riskScore, opacity: 0.8},
  'Risk Score (LLG Level)'
);

// Add legend
addInteractiveLegend(llg_stats, province_stats, nationalTotals);

// Apply dark theme (optional)
var style = require('users/gena/packages:style');
style.SetMapStyleDark();

// ============================================================================
// EXPORT RESULTS
// ============================================================================

Export.table.toDrive({
  collection: llg_stats,
  description: CONFIG.exportDescriptions.llg,
  folder: CONFIG.exportFolder,
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: province_stats,
  description: CONFIG.exportDescriptions.province,
  folder: CONFIG.exportFolder,
  fileFormat: 'CSV'
});

// ============================================================================
// CONSOLE OUTPUT
// ============================================================================

print('=== PNG LANDSLIDE RISK ANALYSIS ===');
print('Total LLGs analyzed:', llg_boundaries.size());
print('Total provinces:', province_stats.size());
print('');
print('LLG Statistics (sample):', llg_stats.limit(3));
print('');
print('Provincial Statistics:', province_stats);
print('');
print('Analysis complete. Check Tasks tab for export status.');