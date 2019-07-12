var express = require('express');
var router = express.Router();
var widget = require('../controllers/tronco_widget_controller')
//var tronco_plot_controller = require('../controllers/tronco_plot_controller');

/* GET users listing. 
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});*/

router.get('/', widget.tronco_widget_get)

router.post('/', widget.tronco_widget_post)

router.get('/user_options', widget.show_options_get)

router.post('/user_options', widget.show_options_post)

router.get('/reconstruction', widget.files_loaded_get)

router.post('/reconstruction', widget.files_loaded_post)

// router.post('/files_loaded/caprese', widget.files_loaded_caprese_post)

router.get('/cluster_selection', widget.select_clusters_get)

router.post('/cluster_selection', widget.select_clusters_post)

router.get('/tronco_plot', widget.tronco_plot_get)

router.post('/tronco_plot', widget.tronco_plot_post)

router.get('/tronco_plot_error', widget.tronco_plot_error_get)

router.post('/visualize_constructed', widget.visualize_constructed_post)

router.get('/save', widget.save_model)

router.get('/logout', widget.logout_post)

router.post('/visualize_public', widget.visualize_public_post)

router.get('/complete_analysis', widget.complete_analysis_get)

module.exports = router;
