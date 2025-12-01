/**
 * ============================================================================
 * COASTAL FLOOD EXPOSURE ASSESSMENT FOR PAPUA NEW GUINEA
 * ============================================================================
 * 
 * Purpose: Analyze coastal inundation exposure and vulnerability at LLG 
 *          (Local-Level Government) and provincial levels using high-resolution 
 *          population data and elevation-based inundation modeling.
 * 
 * Data Sources:
 *   - HRSL (High Resolution Settlement Layer): Population distribution
 *   - SRTM DEM (30m): Elevation data for low-lying coastal areas
 *   - Administrative boundaries: LLG and provincial levels
 * 
 * Key Metrics:
 *   - Exposed Population: Population in areas ≤10m elevation
 *   - Exposure Ratio: Proportion of population in low-elevation coastal zones
 *   - Exposure Density: Population density within vulnerable coastal areas
 * 
 * Methodology Note: 
 *   This analysis uses a simplified elevation threshold (≤10m) as a proxy for
 *   coastal inundation risk. It does not account for sea level rise projections,
 *   storm surge modeling, or coastal protection infrastructure. Results should
 *   be interpreted as indicative exposure to low-lying coastal areas.
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
    llg_boundaries: 'projects/sample-task-app-0nnek4/assets/PNG_LLG'
  },
  
  // Analysis parameters
  elevationThreshold: 10,   // Meters above sea level (LECZ definition)
  scale: 30,                // Spatial resolution in meters
  maxPixels: 1e13,          // Maximum pixels for computation
  tileScale: 4,             // Use larger tiles to reduce memory errors
  
  // Visualization parameters
  populationMax: 500,       // Maximum population for visualization
  exposureRatioMin: 0,
  exposureRatioMax: 1,
  
  // Color palettes
  palettes: {
    population: ['red'],
    coastalZone: ['navy'],
    exposedPop: ['yellow'],
    riskGradient: ['#f2e6ff', '#d9b3ff', '#b366ff', '#8000ff', '#4d0099']
  },
  
  // Export settings
  exportFolder: 'EarthEngineExports',
  exportDescriptions: {
    llg: 'PNG_LLG_Coastal_Exposure_Analysis',
    province: 'PNG_Province_Coastal_Exposure_Summary'
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
 * Load elevation data and create low-elevation coastal zone (LECZ)
 * @param {ee.Geometry} region - Study area geometry
 * @param {number} threshold - Elevation threshold in meters
 * @return {ee.Image} Binary mask of areas below threshold
 */
function loadElevationData(region, threshold) {
  var elevation = ee.Image('USGS/SRTMGL1_003')
    .select('elevation')
    .clip(region);
  
  return elevation.lte(threshold).selfMask();
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
var coastalZone = loadElevationData(png.geometry(), CONFIG.elevationThreshold);
var llg_boundaries = loadAdministrativeBoundaries();

// ============================================================================
// PROCESSING FUNCTIONS
// ============================================================================

/**
 * Calculate exposed population within low-elevation coastal zones
 * @param {ee.Image} population - Population distribution
 * @param {ee.Image} coastalMask - Binary coastal zone mask
 * @return {ee.Image} Exposed population
 */
function calculateExposedPopulation(population, coastalMask) {
  return population.updateMask(coastalMask);
}

/**
 * Calculate coastal exposure metrics for each LLG (Optimized version)
 * Uses a single multi-band image to reduce computation time
 * 
 * @param {ee.FeatureCollection} boundaries - LLG boundaries
 * @param {ee.Image} population - Population image
 * @param {ee.Image} exposedPop - Exposed population image
 * @param {ee.Image} coastalMask - Coastal zone mask
 * @return {ee.FeatureCollection} LLG statistics
 */
function calculateLLGStatistics(boundaries, population, exposedPop, coastalMask) {
  // Create a multi-band image with all needed layers
  var popBandName = population.bandNames().get(0);
  var elevBandName = 'elevation';
  
  var multiband = ee.Image([
    population.select([popBandName], ['total_pop']),
    exposedPop.select([popBandName], ['exposed_pop']),
    coastalMask.select([elevBandName], ['coastal_area'])
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
    var coastalPixels = ee.Number(ee.Algorithms.If(stats.get('coastal_area'), stats.get('coastal_area'), 0));
    
    // Coastal zone area (in km²)
    var coastalAreaKm2 = coastalPixels.multiply(900).divide(1e6);  // 30m × 30m = 900m²
    
    // Calculate exposure metrics with zero-division protection
    var exposureRatio = ee.Algorithms.If(
      totalPop.gt(0),
      exposedPopCount.divide(totalPop),
      0
    );
    
    var exposureDensity = ee.Algorithms.If(
      coastalAreaKm2.gt(0),
      exposedPopCount.divide(coastalAreaKm2),
      0
    );
    
    return feature.set({
      'LLG_Population': totalPop,
      'Exposed_Population': exposedPopCount,
      'Coastal_Area_km2': coastalAreaKm2,
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
    var coastalArea = filtered.aggregate_sum('Coastal_Area_km2');
    
    // Calculate provincial-level metrics
    var exposureRatio = ee.Algorithms.If(
      ee.Number(totalPop).gt(0),
      ee.Number(exposedPop).divide(ee.Number(totalPop)),
      0
    );
    
    var exposureDensity = ee.Algorithms.If(
      ee.Number(coastalArea).gt(0),
      ee.Number(exposedPop).divide(ee.Number(coastalArea)),
      0
    );
    
    return ee.Feature(null, {
      'Province': provinceName,
      'Total_Population': totalPop,
      'Exposed_Population': exposedPop,
      'Coastal_Area_km2': coastalArea,
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
var exposedPopulation = calculateExposedPopulation(HRSL_general, coastalZone);

// Calculate statistics
var llg_stats = calculateLLGStatistics(
  llg_boundaries, 
  HRSL_general, 
  exposedPopulation, 
  coastalZone
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
    value: 'Coastal Inundation Exposure Ratio',
    style: {fontSize: '14px', fontWeight: 'bold'}
  }));
  
  // Color bar
  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {
      bbox: [0, 0, 1, 0.1],
      dimensions: '200x20',
      format: 'png',
      min: CONFIG.exposureRatioMin,
      max: CONFIG.exposureRatioMax,
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
  coastalZone,
  {palette: CONFIG.palettes.coastalZone, min: 0, max: CONFIG.elevationThreshold},
  'Low-Elevation Coastal Zone (≤10m)'
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
    min: CONFIG.exposureRatioMin,
    max: CONFIG.exposureRatioMax,
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

print('=== PNG COASTAL EXPOSURE ANALYSIS ===');
print('Elevation threshold: ≤' + CONFIG.elevationThreshold + 'm');
print('Total LLGs analyzed:', llg_boundaries.size());
print('Total provinces:', province_stats.size());
print('');
print('LLG Statistics (sample):', llg_stats.limit(3));
print('');
print('Provincial Statistics:', province_stats);
print('');
print('Analysis complete. Check Tasks tab for export status.');