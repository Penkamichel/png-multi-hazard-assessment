/**
 * ============================================================================
 * FLOOD RISK ASSESSMENT FOR PAPUA NEW GUINEA
 * ============================================================================
 * 
 * Purpose: Analyze flood exposure and vulnerability at LLG (Local-Level 
 *          Government) and provincial levels using high-resolution population 
 *          data and climate-driven flood projections (RCP 8.5, 2030).
 * 
 * Data Sources:
 *   - HRSL (High Resolution Settlement Layer): Population distribution
 *   - River flood projections: RCP 8.5 scenario (25-year return period)
 *   - Administrative boundaries: LLG and provincial levels
 * 
 * Key Metrics:
 *   - Exposed Population: Population within flood-prone areas
 *   - Exposure Ratio: Proportion of population at risk
 *   - Exposure Density: Population density within flood zones
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
    flood_rcp85_250: 'projects/sample-task-app-0nnek4/assets/r_flood_rcp8p5_250_2030',
    flood_rcp85_25: 'projects/sample-task-app-0nnek4/assets/r_flood_rcp8p5_25_2030',
    llg_boundaries: 'projects/sample-task-app-0nnek4/assets/PNG_LLG'
  },
  
  // Analysis parameters
  scale: 30,                    // Spatial resolution in meters
  maxPixels: 1e13,              // Maximum pixels for computation
  tileScale: 4,                 // Use larger tiles to reduce memory errors
  
  // Visualization parameters
  populationMax: 500,           // Maximum population for visualization
  riskRatioMin: 0,
  riskRatioMax: 1,
  
  // Color palettes
  palettes: {
    population: ['red'],
    floodArea: ['#0000ff'],
    exposedPop: ['#ff8c00'],
    riskGradient: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', 
                   '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
  },
  
  // Export settings
  exportFolder: 'EarthEngineExports',
  exportDescriptions: {
    llg: 'PNG_LLG_Flood_Risk_Analysis',
    province: 'PNG_Province_Flood_Risk_Summary'
  }
};

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Load country boundary for Papua New Guinea
 */
function loadCountryBoundary() {
  var countries = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017');
  return countries.filter(ee.Filter.eq('country_na', 'Papua New Guinea'));
}

/**
 * Load high-resolution population data and filter for study area
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
 * Load river flood projection data
 * @param {ee.Geometry} region - Study area geometry
 * @return {ee.Image} Flood depth image
 */
function loadFloodData(region) {
  return ee.Image(CONFIG.assetPaths.flood_rcp85_25)
    .clip(region);
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
var floodDepth = loadFloodData(png.geometry());
var llg_boundaries = loadAdministrativeBoundaries();

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Create binary flood mask (areas with any flood depth)
 * @param {ee.Image} floodImage - Flood depth image
 * @return {ee.Image} Binary flood mask
 */
function createFloodMask(floodImage) {
  return floodImage.gt(0).selfMask();
}

/**
 * Calculate exposed population within flood zones
 * @param {ee.Image} population - Population distribution
 * @param {ee.Image} floodMask - Binary flood mask
 * @return {ee.Image} Exposed population
 */
function calculateExposedPopulation(population, floodMask) {
  return population.updateMask(floodMask);
}

/**
 * Calculate flood risk metrics for each LLG (Optimized version)
 * Uses a single multi-band image to reduce computation time
 * 
 * @param {ee.FeatureCollection} boundaries - LLG boundaries
 * @param {ee.Image} population - Population image
 * @param {ee.Image} exposedPop - Exposed population image
 * @param {ee.Image} floodMask - Flood mask
 * @return {ee.FeatureCollection} LLG statistics
 */
function calculateLLGStatistics(boundaries, population, exposedPop, floodMask) {
  // Create a multi-band image with all needed layers
  var popBandName = population.bandNames().get(0);
  var floodBandName = floodMask.bandNames().get(0);
  
  var multiband = ee.Image([
    population.select([popBandName], ['total_pop']),
    exposedPop.select([popBandName], ['exposed_pop']),
    floodMask.select([floodBandName], ['flood_area'])
  ]);
  
  return boundaries.map(function(feature) {
    var geometry = feature.geometry();
    var stats = multiband.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: CONFIG.scale,
      maxPixels: CONFIG.maxPixels,
      bestEffort: true,
      tileScale: CONFIG.tileScale
    });
    
    // Extract values with null protection
    var totalPop = ee.Number(ee.Algorithms.If(stats.get('total_pop'), stats.get('total_pop'), 0)).round();
    var exposedPopCount = ee.Number(ee.Algorithms.If(stats.get('exposed_pop'), stats.get('exposed_pop'), 0)).round();
    var floodPixels = ee.Number(ee.Algorithms.If(stats.get('flood_area'), stats.get('flood_area'), 0));
    
    // Flood area (in km²)
    var floodAreaKm2 = floodPixels.multiply(900).divide(1e6);  // 30m × 30m = 900m²
    
    // Calculate risk metrics with zero-division protection
    var exposureRatio = ee.Algorithms.If(
      totalPop.gt(0),
      exposedPopCount.divide(totalPop),
      0
    );
    
    var exposureDensity = ee.Algorithms.If(
      floodAreaKm2.gt(0),
      exposedPopCount.divide(floodAreaKm2),
      0
    );
    
    return feature.set({
      'LLG_Population': totalPop,
      'Exposed_Population': exposedPopCount,
      'Flood_Area_km2': floodAreaKm2,
      'Exposure_Ratio': exposureRatio,
      'Exposure_Density': exposureDensity
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
    var exposedPop = filtered.aggregate_sum('Exposed_Population');
    var floodArea = filtered.aggregate_sum('Flood_Area_km2');
    
    // Calculate provincial-level metrics
    var exposureRatio = ee.Algorithms.If(
      ee.Number(totalPop).gt(0),
      ee.Number(exposedPop).divide(ee.Number(totalPop)),
      0
    );
    
    var exposureDensity = ee.Algorithms.If(
      ee.Number(floodArea).gt(0),
      ee.Number(exposedPop).divide(ee.Number(floodArea)),
      0
    );
    
    return ee.Feature(null, {
      'Province': provinceName,
      'Total_Population': totalPop,
      'Exposed_Population': exposedPop,
      'Flood_Area_km2': floodArea,
      'Exposure_Ratio': exposureRatio,
      'Exposure_Density': exposureDensity
    });
  });
  
  return ee.FeatureCollection(provinceStats).sort('Province');
}

/**
 * Calculate national-level exposed population
 * @param {ee.FeatureCollection} llgStats - LLG statistics
 * @return {ee.Number} Total exposed population
 */
function calculateNationalExposure(llgStats) {
  return llgStats.aggregate_sum('Exposed_Population');
}

// ============================================================================
// ANALYSIS EXECUTION
// ============================================================================

// Create derived datasets
var floodMask = createFloodMask(floodDepth);
var exposedPopulation = calculateExposedPopulation(HRSL_general, floodMask);

// Calculate statistics
var llg_stats = calculateLLGStatistics(
  llg_boundaries, 
  HRSL_general, 
  exposedPopulation, 
  floodMask
);

var province_stats = aggregateToProvinceLevel(llg_stats);
var nationalExposure = calculateNationalExposure(llg_stats);

// ============================================================================
// VISUALIZATION
// ============================================================================

/**
 * Create exposure ratio raster for visualization
 * @param {ee.FeatureCollection} stats - LLG statistics
 * @return {ee.Image} Rasterized exposure ratio
 */
function createExposureRatioRaster(stats) {
  var rasterized = stats.reduceToImage({
    properties: ['Exposure_Ratio'],
    reducer: ee.Reducer.first()
  });
  
  // Mask zero values for better visualization
  return rasterized.updateMask(rasterized.gt(0));
}

/**
 * Add interactive legend with top provinces
 * @param {ee.FeatureCollection} llgStats - LLG statistics
 * @param {ee.FeatureCollection} provinceStats - Provincial statistics
 */
function addInteractiveLegend(llgStats, provinceStats) {
  var legend = ui.Panel({
    style: {position: 'bottom-left', padding: '8px 15px'}
  });
  
  // Title
  legend.add(ui.Label({
    value: 'Flood Exposure Ratio',
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
      max: 1,
      palette: CONFIG.palettes.riskGradient
    },
    style: {stretch: 'horizontal', margin: '0px 8px'}
  });
  legend.add(colorBar);
  
  // Labels
  var labels = ui.Panel({
    widgets: [
      ui.Label('0.00', {margin: '4px 0px', fontSize: '12px', textAlign: 'left', stretch: 'horizontal'}),
      ui.Label('0.50', {margin: '4px 0px', fontSize: '12px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label('1.00', {margin: '4px 0px', fontSize: '12px', textAlign: 'right', stretch: 'horizontal'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  legend.add(labels);
  
  // Calculate national exposure within the function
  var nationalExp = llgStats.aggregate_sum('Exposed_Population');
  
  // National statistics
  nationalExp.evaluate(function(total) {
    legend.add(ui.Label({
      value: 'National Exposed Population: ' + Math.round(total).toLocaleString(),
      style: {fontSize: '12px', fontWeight: 'bold', margin: '10px 0 0 0'}
    }));
    
    // Top 5 provinces
    var top5 = provinceStats.sort('Exposure_Ratio', false).limit(5);
    
    legend.add(ui.Label({
      value: 'Top 5 Provinces by Exposure Ratio',
      style: {fontSize: '12px', fontWeight: 'bold', margin: '10px 0 0 0'}
    }));
    
    top5.evaluate(function(fc) {
      if (fc && fc.features) {
        fc.features.forEach(function(feature, index) {
          var name = feature.properties.Province;
          var ratio = (feature.properties.Exposure_Ratio * 100).toFixed(1);
          legend.add(ui.Label(
            (index + 1) + '. ' + name + ': ' + ratio + '%',
            {fontSize: '12px', margin: '2px 0 0 0'}
          ));
        });
      }
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
  floodMask,
  {palette: CONFIG.palettes.floodArea, min: 0, max: 1},
  'Flood Hazard Area'
);

Map.addLayer(
  exposedPopulation,
  {palette: CONFIG.palettes.exposedPop, min: 0, max: CONFIG.populationMax},
  'Exposed Population'
);

var exposureRaster = createExposureRatioRaster(llg_stats);
Map.addLayer(
  exposureRaster,
  {
    min: CONFIG.riskRatioMin,
    max: CONFIG.riskRatioMax,
    palette: CONFIG.palettes.riskGradient,
    opacity: 0.8
  },
  'Exposure Ratio (LLG Level)'
);

// Add legend
addInteractiveLegend(llg_stats, province_stats);

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

print('=== PNG FLOOD RISK ANALYSIS ===');
print('Total LLGs analyzed:', llg_boundaries.size());
print('Total provinces:', province_stats.size());
print('');
print('LLG Statistics (sample):', llg_stats.limit(3));
print('');
print('Provincial Statistics:', province_stats);
print('');
print('Analysis complete. Check Tasks tab for export status.');