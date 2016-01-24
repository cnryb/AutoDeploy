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

    var longTime = new Date().getTime();
    fs.writeFile(path.join("./", "req" + longTime), JSON.stringify(req.body));
    res.render('index', { title: 'Express' });

    var query = req.body.hook;
    if (query) {
        query = JSON.parse(query);
        if (query.password === "password" && query.hook_name === "push_hooks") {

            console.log("密码验证成功")
            var clonePath = "./tmpRepository/clone" + longTime;
            var sshPrivateKey = "./id_rsa";
            var sshPublicKey = "./id_rsa.pub";

            var url = "git@git.oschina.net:cnryb/AutoDeploy.git";
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

            Clone(url, clonePath, opts).then(function (repo) {
                console.log("clone Repository done.");
                // 复制目录
                exists(clonePath, './', copy);
                console.log("copy Repository done.");

                fs.writeFile(path.join("./", "res" + longTime), "done");

            }).catch(function (error) {
                console.error(error);
                fs.writeFile(path.join("./", "res" + longTime), JSON.stringify(error));
            });
        }
    }


});


module.exports = router;




var stat = fs.stat;

/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function (src, dst) {
    // 读取目录中的所有文件/目录
    fs.readdir(src, function (err, paths) {
        if (err) {
            throw err;
        }
        paths.forEach(function (path) {
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;
            stat(_src, function (err, st) {
                if (err) {
                    throw err;
                }
                // 判断是否为文件
                if (st.isFile()) {
                    // 创建读取流
                    readable = fs.createReadStream(_src);
                    // 创建写入流
                    writable = fs.createWriteStream(_dst);   
                    // 通过管道来传输流
                    readable.pipe(writable);
                }
                // 如果是目录则递归调用自身
                else if (st.isDirectory()) {
                    exists(_src, _dst, copy);
                }
            });
        });
    });
};
// 在复制目录前需要判断该目录是否存在，不存在需要先创建目录
var exists = function (src, dst, callback) {
    fs.exists(dst, function (exists) {
        // 已存在
        if (exists) {
            callback(src, dst);
        }
        // 不存在
        else {
            fs.mkdir(dst, function () {
                callback(src, dst);
            });
        }
    });
};