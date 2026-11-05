const express = require('express');
const router = express.Router();
const busDataService = require('../services/busDataService');
const graphBuilder = require('../services/graphBuilder');

router.post('/route', async (req, res) => {
  try {
    const { from, to, algorithm = 'ids' } = req.body;

    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from and to with lat/lng'
      });
    }

    const graph = await graphBuilder.buildGraph();
    const startStops = busDataService.findNearbyStopsSync(from.lat, from.lng, 500);
    const endStops = busDataService.findNearbyStopsSync(to.lat, to.lng, 500);

    if (startStops.length === 0) {
      return res.json({
        success: false,
        error: 'No bus stops found near starting location',
        suggestion: 'Try expanding search radius'
      });
    }

    if (endStops.length === 0) {
      return res.json({
        success: false,
        error: 'No bus stops found near destination',
        suggestion: 'Try expanding search radius'
      });
    }

    res.json({
      success: true,
      data: {
        from,
        to,
        startStops: startStops.slice(0, 3),
        endStops: endStops.slice(0, 3),
        graph: {
          nodes: Object.keys(graph.nodes).length,
          edges: Object.keys(graph.edges).length
        },
        algorithm
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/graph', async (req, res) => {
  try {
    const graph = await graphBuilder.buildGraph();

    res.json({
      success: true,
      data: graph
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
