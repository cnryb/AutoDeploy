var express = require('express');
var router = express.Router();
var fs = require("fs");
var path = require('path');

/* GET home page. */
router.get('/', function (req, res, next) {
    var num=new Date().getUTCSeconds();
    
    res.render('index', { title: 'Express' });
});

router.post('/', function (req, res, next) {
    // JSON.stringify(req)
    fs.writeFileSync(path.join("./", "req"+new Date().getTime()), JSON.stringify(req));
    res.render('index', { title: 'Express' });
});


module.exports = router;
