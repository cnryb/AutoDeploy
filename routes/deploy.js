var express = require('express');
var router = express.Router();
var fs = require("fs");
var path = require('path');
var NodeGit = require("nodegit");
var Repository = NodeGit.Repository;
var Clone = NodeGit.Clone;

/* GET home page. */
router.get('/', function (req, res, next) {
    // var num = new Date().getUTCSeconds();

    res.render('index', { title: 'Express' });
});


router.post('/', function (req, res, next) {

    fs.writeFile(path.join("./", "req" + new Date().getTime()), JSON.stringify(req.body));
    res.render('index', { title: 'Express' });

    var query = req.body.hook;

    if (query && query.password === "password" && query.hook_name === "push_hooks") {


        var clonePath = "./clone";
        var sshPrivateKey = "D:/id_rsa";
        var sshPublicKey = "D:/id_rsa.pub";

        var url = "git@git.oschina.net:cnryb/HuaLang.git";
        var opts = {
            fetchOpts: {
                callbacks: {
                    certificateCheck: function () {
                        return 1;
                    },
                    credentials: function (url, userName) {
                        //return NodeGit.Cred.sshKeyFromAgent(userName);        //使用agent方式获取代码
                        return NodeGit.Cred.sshKeyNew(
                            userName,
                            sshPublicKey,
                            sshPrivateKey,
                            "");
                    }
                }
            }
        };

        if (fs.existsSync(clonePath)) {
            fs.unlink(clonePath);
        }

        Clone(url, clonePath, opts).then(function (repo) {
            console.log("done");
            fs.writeFile(path.join("./", "res" + new Date().getTime()), "done");
        }).catch(function (error) {
            console.error(error);
            fs.writeFile(path.join("./", "res" + new Date().getTime()), JSON.stringify(error));
        });
    }

});


module.exports = router;


