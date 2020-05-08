var path = require('path');
var formidable = require('formidable')
const rscript = require('js-call-r');
var fs = require('fs')
// var zip = require('express-zip')
var request_module = require('request')
var crypto = require('crypto')

const mongodb = require('mongodb')
const MongoClient = mongodb.MongoClient
const dburl = "mongodb://localhost:27017/users_prova"

  


// This function is called right after the previous one
// In tronco.js route file, the route '/tronco/user_options'
// is associated to this function in case of a get
exports.show_options_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        var session_dir =  __dirname + '/widget_data/' + req.session.email
        var options = {} 
        var models_array = []
        var graphs_array = []
        var analysis_names = []
        // This is the variable which will eventually contain the list of 
        // graphs reconstructed by the authenticated user
        req.session.graphs_list = undefined
        // Get all the analysis previously constructed by a user:
        // for each analysis get models and graphs
        if (fs.existsSync(session_dir)) {
            // read the user folder, which contains a folder for each analysis
            var files = fs.readdirSync(session_dir) 
            // Loop on every analysis folder
            files.forEach(function(file, index) {
                var model_dir = session_dir + '/' + file + '/results'
                console.log(model_dir)
                // Now check if the analysis contains the results folder
                if (fs.existsSync(model_dir)) {
                    var models = fs.readdirSync(model_dir)
                    // Store the analysis name in a variable
                    analysis_names.push(file)
                    models.forEach(function(file_model, index) {
                        console.log(file_model)
                        console.log('FILE: ' + file)
                        var name = file_model.split('.')
                        name.pop()
                        name = name.join('.')
                        models_array.push([file, name])
                    })
                }
                var graphs_dir = session_dir + '/' + file + '/plots'
                if (fs.existsSync(graphs_dir)) {
                    graphs = fs.readdirSync(graphs_dir)
                    graphs.forEach(function(file_graph, index) {
                        console.log(file_graph)
                        console.log('FILE: ' + file)
                        var name = file_graph.split('.')
                        name.pop()
                        name = name.join('.')
                        graphs_array.push([file, name])
                    })
                }
                
                
            })
             
            options['models'] = models_array
            options['graphs_options'] = graphs_array
            req.session.graphs_list = options
            res.render('study_name', {graphs_options : options['graphs_options'],
            login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout',
            analysis_names : analysis_names})
        } else {
            res.render('study_name', {login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
        }
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called after the user types a name 
// for the analysis to be made
// In tronco.js route file, the route '/tronco/user_options'
// is associated to this function in case of a post
exports.show_options_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        var form = new formidable.IncomingForm()
        form.parse(req, (err, fields, files) => {
            title = fields.inputName
            study_dir = __dirname + '/widget_data/' + req.session.email + '/' + title
            if (fs.existsSync(study_dir)) {
                res.render('study_name', 
                        {error: 'Error: a study with the same name already exists',
                        login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                return;
            }
            // Store analysis title in current session
            req.session.title = title
            res.redirect('/cytronjs/tronco')
        })
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called right after the previous one
// In tronco.js route file, the route '/tronco'
// is associated to this function in case of a get
exports.tronco_widget_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        var current_directory = __dirname
        current_directory = current_directory.replace(/\\/g, "/")
        // Call the first R script: it checks if every required package is installed
        // If needed, it installs any missing package required
        var script = current_directory + '/load_packages_picnic.R'
        rscript.call(script, 
                     {working_directory : current_directory}, (err, result) => {
			 if (err)
			     console.log(err)
                        res.render('widget', {login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                    })
        //console.log(result)
        //res.render('widget', )
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
};

// This function is called after a user selects input files
// In tronco.js route file, the route '/tronco'
// is associated to this function in case of a post
exports.tronco_widget_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        // Create directories needed to store the pipeline data
        var email_dir = __dirname + '/widget_data/' + req.session.email
        email_dir = email_dir.replace(/\\/g, '/')
        if (!fs.existsSync(email_dir))
            fs.mkdirSync(email_dir)

        var session_dir =  __dirname + '/widget_data/' + req.session.email + '/' + req.session.title
        session_dir = session_dir.replace(/\\/g, '/')

        if (!fs.existsSync(session_dir))
            fs.mkdirSync(session_dir)
        //  Create directory to store uploaded input files
        var upload_dir = session_dir + '/uploads'
        upload_dir = upload_dir.replace(/\\/g, '/')

        if(!fs.existsSync(upload_dir))
            fs.mkdirSync(upload_dir)
        
        var form = new formidable.IncomingForm({keepExtensions : true});
        // TODO: add errors
        form.parse(req, (err, fields, files) => {
            
            var current_directory = __dirname
            current_directory = current_directory.replace(/\\/g, "/")
            // Get the MAF input file uploaded by the user
            var maf = files['MAFinput']
            if (fields.MAF && maf.name != '') {
                maf_p = maf.path.replace(/\\/g, '/')
            } else {
                maf_p = ''
            }
            // Get the GISTIC input file uploaded by the user
            var gistic_file = files['GISTICinput']
            if (fields.gistic && gistic_file.name != '') {
                gistic_p = gistic_file.path.replace(/\\/g, '/')
            } else {
                gistic_p = ''
            }
            // Get the gene list file uploaded by the user
            var interest = files['INTERESTinput']
            if (fields.interest && interest.name != '') {
                interest_path = interest.path.replace(/\\/g, '/')
            } else {
                interest_path = ''
            }
            // Get custom boolean user input
            var bool_input = files['BOOLEANinput']
            if (fields.boolean && bool_input.name != '') {
                boolean_p = bool_input.path.replace(/\\/g, '/')
            } else {
                boolean_p = ''
            }
            // Get the event type set by the user for the custom boolean input:
            var custom_type = fields.event_type
            // Get the file which contains the cluster data
            var clusters = ''
            if (fields.cluster) {
                clusters = files['CLUSTERinput'].path
                clusters = clusters.replace(/\\/g, '/')
                req.session.cluster_file = files['CLUSTERinput'].name
            }
            // Get the separator for every file
            var cluster_sep = (fields.cl_separator_selection === 'Space/tabs') ? '':fields.cl_separator_selection
            var maf_sep = (fields.maf_separator_selection === 'Space/tabs') ? '':fields.maf_separator_selection
            var gistic_sep = (fields.gistic_separator_selection === 'Space/tabs') ? '':fields.gistic_separator_selection
            var boolean_sep = (fields.boolean_separator_selection === 'Space/tabs') ? '':fields.boolean_separator_selection
            var script = current_directory + '/picnic_import.R'
            console.log(interest_path)
            rscript.call(script, {maf_path : maf_p, 
                                    genes_interest : interest_path, 
                                    gistic_path : gistic_p, 
                                    user_directory : session_dir,
                                    boolean_path : boolean_p, 
                                    custom_event : custom_type,
                                    clusters_path : clusters,
                                    cluster_separator : cluster_sep,
                                    maf_separator : maf_sep,
                                    gistic_separator : gistic_sep,
                                    boolean_separator : boolean_sep},
                                    (error, result) => {
                        
                            //if (err) {
                            //   console.log('err: ' + err)
                            //} else {
            
                                //console.log('CLUSTERS: ' + files['CLUSTERinput'].path)
                                
                                //res.download(email_dir + '/MAF.RData')
                                // res.render('index')
            if (result) {
                // Save in the session the name of the final dataset to use for reconstruction
                req.session.to_reconstruct = result.to_plot
                // Save in the session the names of the columns contained in the cluster dataset
                if (fields.cluster) {
                    req.session.columns = result.columns
                    // Save in the session the cluster separator
                    req.session.cluster_separator = cluster_sep
                    // Render page to select columns for cluster subtyping
                    res.redirect('/cytronjs/tronco/cluster_selection')
                } else {
                    // No cluster file has been uploaded -> proceed directly to reconstruction page
                    res.redirect('/cytronjs/tronco/reconstruction')
                
                }
            } else {
                // Some error occured during script execution ->
                // render input selection page again
		console.log(err)
                res.render('widget', 
                    {errors : ['Attention, there was an error in data input', 
                            'Make sure to select the correct files'],
                            login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                
            }
        })
            
        })

        //next()                                          
        //}

        // Function called everytime a file is uploaded through the form   
        form.on('fileBegin', function (name, file) {
            if (file.name != '') {
                //const [fileName, fileExt] = file.name.split('.')
                //fs.rename(file.path, )
                file.path = upload_dir + '/' + file.name
            }
            
        })

        form.on('file', function (name, file) {
            if (file.name != '') {
                console.log('file caricato: ' + file.name)
            }
            
        })
        //res.end()
        //return next()
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }  
}

// Function called after the previous one when a user selects
// a cluster file.
// In tronco.js route file, the route '/tronco/cluster_selection'
// is associated to this function in case of a get
exports.select_clusters_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        res.render('cluster_selection', 
                    {columns : req.session.columns,
                    login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// Function called after a user selects the cluster and ID column
// In tronco.js route file, the route '/tronco/cluster_selection'
// is associated to this function in case of a post
exports.select_clusters_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        var session_dir =  __dirname + '/widget_data/' + 
                            req.session.email + '/' +
                            req.session.title
        session_dir= session_dir.replace(/\\/g, '/')
        var form = new formidable.IncomingForm({keepExtensions : true});
        // Prepare a variable to store any cluster which is not found in
        // the input mutation files
        req.session.clusters_not_found = ''
        form.parse(req, (err, fields, files) => {
            // Get the script to execute
            var script = __dirname + '/picnic_events_clustering.R'
            // Retrieve the file containg the model data
            data_path = session_dir + '/' + req.session.to_reconstruct
            // Retrieve the cluster file which has previously been uploaded
            var cluster_file = session_dir + '/uploads/' + req.session.cluster_file

            // Call the script for mutation subtyping
            rscript.call(script, 
                {data : data_path, 
                    // filter_freq : fields.freq_selection, 
                    cluster_column : fields.cluster_selection,
                    id_column : fields.id_selection,
                    cluster_path : cluster_file,
                    reconstruction_dir : session_dir,
                    separator : req.session.cluster_separator}, (error, result) => {
                                    
            console.log(result)
            // Three possible cases:
            // 1. At least one sample was found for each cluster
            // 2. For some clusters no samples were found
            // 3. There is an error in the files or columns selected
            if (result) {
                if (result.result === 'no_errors') {
                    // Case 1
                    res.redirect('/cytronjs/tronco/reconstruction')
                }
                if (result.result === 'clusters_not_found') {
                    // Case 2
                    req.session.clusters_not_found = result.clusters
                    res.redirect('/cytronjs/tronco/reconstruction')
                }
            } else {
                // Case 3
                    res.render('cluster_selection', 
                        {errors: 
                        'Attention, there was an error in the cluster selection process. \nMake sure to select the right columns',
                        columns : req.session.columns,
                        login_logout : 'log-out', 
                        login_logout_link : '/cytronjs/tronco/logout'})
                
            }
        })
        })
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called after the cluster subtyping processes
// finishes
// In tronco.js route file, the route '/tronco/reconstruction'
// is associated to this function in case of a get
// This function displays a form to select the reconstruction algorithm
exports.files_loaded_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        var dir = __dirname + '/widget_data/' + req.session.email + '/' + req.session.title
        var clusters = []
        console.log('!!!!!' + dir)
        // Get cluster names
        fs.readdir(dir, function(err, files) {
            files.forEach(function(file, index) {
                if (!(['plots', 'uploads'].includes(file))) {
                    // Remove file extension from name
                    var name = file.split('.')
                    name.pop()
                    name = name.join('.')
                    clusters.push(name)
                }
            })
            console.log(req.session.clusters_not_found)
            if (req.session.clusters_not_found) {
                // Some clusters don't contain any sample
                // render the page with a message
                res.render('widget_reconstruction',
                        {clusters : clusters, 
                        errors : [req.session.clusters_not_found],
                        login_logout : 'log-out', 
                        login_logout_link : '/cytronjs/tronco/logout'})
            } else {
                // Every cluster contains at least one sample -> 
                // No message needs to be displayed
                res.render('widget_reconstruction',
                            {clusters : clusters,
                            login_logout : 'log-out', 
                            login_logout_link : '/cytronjs/tronco/logout'})
            }
            
        })
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called after the user selects the cluster
// for the reconstruction.
// In tronco.js route file, the route '/tronco/cluster_selection'
// is associated to this function in case of a post
exports.files_loaded_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        var session_dir = ''
        var script = __dirname + '/picnic_reconstruct.R'
        session_dir =  __dirname + '/widget_data/' + req.session.email + '/' + req.session.title
        session_dir = session_dir.replace(/\\/g, '/')

        var result_dir = session_dir + '/results'

        if (!fs.existsSync(result_dir)) {
            fs.mkdirSync(result_dir)
        }
        var upload_dir = session_dir + '/uploads'
        var form = new formidable.IncomingForm({keepExtensions : true});
        form.parse(req, (err, fields, files) => {
            var min_freq = (fields.freq && fields.freq_selection != '') ? fields.freq_selection : ''
            console.log('!!!!' + min_freq)
            if (fields.capri_submit) {
                // Case when the algorithm selected is capri
                // Get algorithm parameters set by the user
                var bic = fields.bic ? fields.bic:''
                var aic = fields.aic ? fields.aic:''
                var mutex = files['MUTEXinput']
                if (fields.MUTEX && mutex.name != '') {
                    mutex = maf.path.replace(/\\/g, '/')
                } else {
                    mutex = ''
                }
                console.log(mutex)
                rscript.call(script, {method : 'capri',
                                            model : session_dir + '/' + fields.cluster_selection + '.RData',
                                            directory : session_dir,
                                            bic : bic,
                                            aic : aic,
                                            command : fields.command,
                                            bootstrap : fields.err_rate_capri,
                                            name : fields.cluster_selection,
                                            result_dir : result_dir,
                                            mutex : mutex,
                                            filter_freq : min_freq}, (error, result)=> {

                                            
                                     
                                    
                console.log(result)
                if (result) {
                    // Case when the reconstruction encontered no errors
                    res.redirect('/cytronjs/tronco/tronco_plot')
                } else {
                    // This is the case when reconstruction fails -> the page must
                    // be reloaded.
                    clusters = []
                    fs.readdir(session_dir, function(err, files) {
                        files.forEach(function(file, index) {
                            if (!(['plots', 'uploads'].includes(file))) {
                                var name = file.split('.')
                                name.pop()
                                name = name.join('.')
                                clusters.push(name)
                            }
                        })//, function(){})})
                        if (req.session.clusters_not_found) {
                            res.render('widget_reconstruction',
                                    {clusters : clusters, 
                                    errors : [req.session.clusters_not_found],
                                    reconstruction_error : 
                                        'Something went wrong in the reconstruction of cluster ' + fields.cluster_selection + '\nSelect another cluster',
                                    login_logout : 'log-out', 
                                    login_logout_link : '/cytronjs/tronco/logout'})
                        } else {
                            res.render('widget_reconstruction',
                                        {clusters : clusters,
                                        reconstruction_error : 
                                        'Something went wrong in the reconstruction of cluster ' + fields.cluster_selection + '\nSelect another cluster',
                                        login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                        }
                    })
                }
            })
            } else if (fields.caprese_submit) {
                // Case when the algorithm chosen is caprese
                rscript.call(script, {method : 'caprese',
                                                model : session_dir + '/' + fields.cluster_selection +'.RData',
                                                directory : session_dir,
                                                result_dir : result_dir,
                                                name : fields.cluster_selection,
                                                filter_freq : min_freq}, (error, result) => {
                                         
                                        //(result) => {
                console.log(result)
                if (result) {
                    // Case when the reconstruction encontered no errors
                    res.redirect('/cytronjs/tronco/tronco_plot')
                } else {
                    // This is the case when reconstruction fails -> the page must
                    // be reloaded.
                    clusters = []
                    fs.readdir(session_dir, function(err, files) {
                        files.forEach(function(file, index) {
                            if (!(['plots', 'uploads'].includes(file))) {
                                //const [fileName, fileExt] = file.split('.')
                                var name = file.split('.')
                                name.pop()
                                name = name.join('.')
                                clusters.push(name)
                            }
                        })//, function(){})
                            if (req.session.clusters_not_found) {
                                res.render('widget_reconstruction',
                                        {clusters : clusters, 
                                        errors : [req.session.clusters_not_found],
                                        reconstruction_error : 
                                            'Something went wrong in the reconstruction of cluster ' + fields.cluster_selection + '\nSelect another cluster',
                                            login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                            } else {
                                res.render('widget_reconstruction',
                                            {clusters : clusters,
                                            reconstruction_error : 
                                            'Something went wrong in the reconstruction of cluster ' + fields.cluster_selection + '\nSelect another cluster',
                                            login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout'})
                            }
                        })
                }
            })
            }
        })
        form.on('fileBegin', function (name, file) {
            if (file.name != '') {
                file.path = upload_dir + '/' + file.name
            }
            
        })
    
        form.on('file', function (name, file) {
            if (file.name != '') {
                console.log('file caricato: ' + file.name)
            }
            
        })
    } else {
        // The session expired -> display home page
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called after the reconstruction process ends
// In tronco.js route file, the route '/tronco/tronco_plot'
// is associated to this function in case of a post
// This function diplays a form to set parameters to visualize and export model
// in graphml format
exports.tronco_plot_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        result_dir =  __dirname + '/widget_data/' + 
            req.session.email + '/' + 
            req.session.title + '/results'
        result_dir = result_dir.replace(/\\/g, '/')
        // Retrieve the models reconstructed in this analysis
        // so tha the user can select which one he/she wants to plot
        var models_ready = []
        fs.readdir(result_dir, function(err, files) {
            files.forEach(function(file, index) {
                console.log('!!!' + file)
                var name = file.split('.')
                name.pop()
                name = name.join('.')
                models_ready.push(name)
            })
            res.render('construction_successful',
                {models : models_ready,
                    login_logout : 'log-out', 
                    login_logout_link : '/cytronjs/tronco/logout'})
        })
    }
}

// This function is called after the reconstruction process ends
// In tronco.js route file, the route '/tronco/tronco_plot'
// is associated to this function in case of a post
// This function diplays a form to set parameters to visualize and export model
// in graphml format
exports.tronco_plot_error_get = function(req, res, next) {
    if (req.isAuthenticated()) {
        result_dir =  __dirname + '/widget_data/' + 
            req.session.email + '/' + 
            req.session.title + '/results'
        result_dir = result_dir.replace(/\\/g, '/')
        // Retrieve the models reconstructed in this analysis
        // so tha the user can select which one he/she wants to plot
        var models_ready = []
        fs.readdir(result_dir, function(err, files) {
            files.forEach(function(file, index) {
                console.log('!!!' + file)
                var name = file.split('.')
                name.pop()
                name = name.join('.')
                models_ready.push(name)
            })
            res.render('construction_successful',
                {models : models_ready,
                    login_logout : 'log-out', 
                    login_logout_link : '/cytronjs/tronco/logout',
                    error_plot : 'Something went wrong in the display of the cluster selected, please repeat the reconstruction or reconstruct another cluster'})
        })
    }
}


// This function is called after the user sets 
// the parameters for model visualization
exports.tronco_plot_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        var form = new formidable.IncomingForm()
        form.parse(req, (err, fields, files) => {
            var current_directory = __dirname
            current_directory = current_directory.replace(/\\/g, "/")
            // Get the confidence values set by the user
            var c_hg = ''
            var c_tp = ''
            var c_pr = ''
            if (fields.hg) {
                c_hg = 'hg'
            }
            if (fields.tp) {
                c_tp = 'tp'
            }
            if (fields.pr) {
                c_pr = 'pr'
            }
            // Get value of prima facie parameter
            var pf = false
            if (fields.pf != undefined) {
                pf = true
            }
            session_dir = __dirname + '/widget_data/' + req.session.email + '/' + req.session.title
            session_dir = session_dir.replace(/\\/g, '/')
            // get dir where reconstructed models
            // files are be stored
            result_dir =  session_dir + '/results'
            // get dir where graphml files will be stored
            plots_dir = session_dir + '/plots'
            if (!fs.existsSync(plots_dir)) {
                fs.mkdirSync(plots_dir)
            }
            
            var name = fields.cluster_selection
            // get the path to the model file to diplay
            var path = result_dir + '/' + fields.cluster_selection + '.RData'
            var script = current_directory + "/test.R"
            rscript.call(script, {modelPath : path,
                                    modelName: name, 
                                    hg: c_hg, tp: c_tp, 
                                    pr : c_pr, 
                                    output_dir : plots_dir,
                                    pf : pf,
                                    sess_id : req.session.id},
                                (error, result) => {
				    console.log(result)
				    console.log(error)
                if (result) {
                    // No error occured during script execution
                    console.log(result)
                    console.log(result.result)
                    fs.readFile(result.result, 'utf8', function(error, data) {
                        req.session.graph_name = name
                        if (req.session.graphs_list) {
                            fs.readdir(__dirname + '/public_data/', function(err, files) {
                                res.render('index', {content : data, 
                                    graphs_options : req.session.graphs_list['graphs_options'],
                                    login_logout : 'log-out', login_logout_link : '/cytronjs/tronco/logout',
                                    public_graphs_name : files})
                            })
                            // This is not the first analysis made by the user
                            
                            
                        } else {
                            fs.readdir(__dirname + '/public_data/', function(err, files) {
                                res.render('index', {content : data,
                                    login_logout : 'log-out',
                                    login_logout_link : '/cytronjs/tronco/logout',
                                    public_graphs_name : files})
                            })
                        }
                            
                    });
                } else if (error){
                    res.redirect('/cytronjs/tronco/tronco_plot_error')
                }
            })
        })
    } else {
        res.redirect('/cytronjs/welcome')
    }
}

// This function is called when a user doesn't start a new reconstruction
// but chooses to visualize an already built graph
exports.visualize_constructed_post = function(req, res, next) {
    if (req.isAuthenticated()) {
        var session_dir = __dirname + '/widget_data/' + 
        req.session.email + '/'
        var form = new formidable.IncomingForm()
        form.parse(req, (err, fields, files) => {
            console.log('!!!!' + fields.private_selection)
            var array = JSON.parse(fields.private_selection);
            // The variable array now contains the study name in the 
            // first position, and the model name in second position
            // Get the path to the graph
            var file_graph = session_dir + array[0] + '/plots/' +
            array[1] + '.graphml'
            fs.readFile(file_graph, 'utf8', function(error, data) {
                req.session.graph_name = array[1]
                if (!req.session.title) {
                    req.session.title = array[0]
                }
                // Render the page for visualization
                fs.readdir(__dirname + '/public_data/', function(err, files) {
                    res.render('index', {content : data,
                        graphs_options : req.session.graphs_list['graphs_options'],
                        login_logout : 'log-out', 
                        login_logout_link : '/cytronjs/tronco/logout',
                        public_graphs_name : files})
                })
                
            })
        })
    }
}

exports.save_model = function(req, res, next) {
    session_dir = __dirname + '/widget_data/' + req.session.email + '/' + req.session.title
    // get dir where reconstructed models
    // files are be stored
    result_dir =  session_dir + '/results/'
    // get dir where graphml files will be stored
    plots_dir = session_dir + '/plots/'
    res.download(plots_dir + req.session.graph_name + '.graphml')
}

// This function is called when a user (could be both authenticated or not)
// chooses to visualize a public model
// in this case, when the index page is rendered, a variable which reports that 
// a public model is being visualized is sent, so that there is not the possibility
// of saving the graph
exports.visualize_public_post = function(req, res) {
    var form = new formidable.IncomingForm()
    form.parse(req, (err, fields, files) => { 
        var to_visualize = fields.public_selection
        var to_visualize_path = __dirname + '/public_data/' + fields.public_selection
        fs.readFile(to_visualize_path, 'utf8', function(error, data) {
            if (req.isAuthenticated()) {
                // Render the page for visualization
                fs.readdir(__dirname + '/public_data/', function(err, files) {
                    res.render('index', {content : data,
                        graphs_options : req.session.graphs_list['graphs_options'],
                        login_logout : 'log-out', 
                        login_logout_link : '/cytronjs/tronco/logout',
                        public_graphs_name : files,
                    is_public : true})
                })
            } else {
                fs.readdir(__dirname + '/public_data/', function(err, files) {
                    res.render('index', {content : data,
                    login_logout : 'log-in',
                    login_logout_link : '/cytronjs/welcome',
                    public_graphs_name : files,
                    is_public : true})
                })
            }
        })
    })
}

exports.logout_post = function(req, res) {
    req.logout()
    res.redirect('/cytronjs/welcome')
}

exports.complete_analysis_get = function(req, res) {
    var analysis_name = req.query.analysis_selection
    req.session.title = analysis_name
    req.session.clusters_not_found = undefined
    res.redirect('/cytronjs/tronco/reconstruction')
}
