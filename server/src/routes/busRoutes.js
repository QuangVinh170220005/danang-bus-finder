const express = require('express');
const router = express.Router();
const busDataService = require('../services/busDataService');
const routingService = require('../services/routingService');

router.get('/routes', async (req, res) => {
  try {
    const routes = await busDataService.getAllRoutes();
    res.json({
      success: true,
      data: routes,
      count: routes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/routes/:id', async (req, res) => {
  try {
    const route = await busDataService.getRouteById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/stops', async (req, res) => {
  try {
    const stops = await busDataService.getAllStops();
    res.json({
      success: true,
      data: stops,
      count: stops.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/stops/near', async (req, res) => {
  try {
    const { lat, lng, radius = 500 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Missing lat or lng parameter'
      });
    }

    const stops = await busDataService.findNearbyStops(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius)
    );

    res.json({
      success: true,
      data: stops,
      count: stops.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/routes/:id/geometry', async (req, res) => {
  try {
    const route = await busDataService.getRouteById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    const segments = await routingService.getBatchRouteGeometry(route.stops);

    res.json({
      success: true,
      data: {
        routeId: route.id,
        segments,
        stops: route.stops
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
