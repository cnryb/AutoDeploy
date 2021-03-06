var express = require('express');
var router = express.Router();
var fs = require("fs");
var path = require('path');
var NodeGit = require("nodegit");
var nodemailer = require('nodemailer');

var Repository = NodeGit.Repository;
var Clone = NodeGit.Clone;

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express ,oh!!' + getNowTime() });
});


router.post('/', function(req, res, next) {

    res.render('index', { title: 'Express' });

    var longTime = new Date().getTime();
    var logFileName = path.join("./log", "deploy" + longTime);

    fs.writeFileSync(logFileName, getNowTime() + "        接收到的 req body 数据   " + JSON.stringify(req.body));

    var query = req.body.hook;
    if (query) {
        query = JSON.parse(query);
        var name = query.push_data.repository.name;
        fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "        开始处理   " + name, { flag: "a" });

        var config = fs.readFileSync(path.join("./config", name.toLowerCase() + ".config"), "utf-8")
        config = JSON.parse(config);

        console.log("接收到 " + name + " 的部署请求");

        if (query.password === config.password && query.hook_name === "push_hooks") {

            console.log("密码验证成功");
            fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "        密码验证成功", { flag: "a" });

            var clonePath = "./tmpRepository/clone" + longTime;
            var sshPrivateKey = config.sshPrivateKey;
            var sshPublicKey = config.sshPublicKey;

            var url = config.repository;
            var opts = {
                fetchOpts: {
                    callbacks: {
                        certificateCheck: function() {
                            return 1;
                        },
                        credentials: function(url, userName) {
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


            var transporter = nodemailer.createTransport(config.mailConfig.serverConfig);

            var mailOptions = {
                from: config.mailConfig.from, // sender address
                to: config.mailConfig.to, // list of receivers
                subject: '', // Subject line
                html: '' // html body
            };


            fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     begin clone Repository " + url, { flag: "a" });
            Clone(url, clonePath, opts).then(function(repo) {
                console.log("clone Repository done.");
                fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     clone Repository done.", { flag: "a" });
                // 复制目录
                exists(clonePath + "/" + config.copyFrom, config.copyTo, null, copy);

                console.log("copy Repository done.");
                fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     copy Repository done.", { flag: "a" });

                fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     all done", { flag: "a" });

                mailOptions.subject = name + " 项目已经成功为您自动部署";
                mailOptions.html = mailOptions.subject + "<br><br>"

                mailOptions.html += readLog(logFileName);

                fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     部署完成，准备开始发送邮件通知", { flag: "a" });

                console.log("部署完成，准备开始发送邮件通知");

                //发送邮件通知
                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     部署完成，发送邮件通知失败      " + error, { flag: "a" });
                        return console.log(error);
                    }
                    console.log('部署完成，发送邮件通知成功：' + info.response);
                    console.log('Message sent: ' + info.response);
                    fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     部署完成，发送邮件通知成功      " + info.response, { flag: "a" });
                });


            }).catch(function(error) {
                console.error(error);

                fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     error      " + JSON.stringify(error), { flag: "a" });

                mailOptions.subject = name + "项目自动部署失败";
                mailOptions.html = mailOptions.subject + "，请您及时处理。<br><br>"
                mailOptions.html += readLog(logFileName);

                transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     部署失败，发送邮件通知失败      " + error, { flag: "a" });
                        return console.log(error);
                    }
                    fs.writeFileSync(logFileName, "\r\n" + getNowTime() + "     部署失败，发送邮件通知成功      " + error, { flag: "a" });
                    console.log('Message sent: ' + info.response);
                });
            });

        } else {
            //密码不正确

        }
    }


});


module.exports = router;




function readLog(filePath) {
    var log = fs.readFileSync(filePath, "utf-8")
    log = log.replace(/\r\n/g, "<br>");
    log = log.replace(/\n/g, "<br>");
    return log;
}



function getNowTime() {
    return new Date().Format("yyyy-MM-dd HH:mm:ss:S");
}



Date.prototype.Format = function(fmt) { //author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "H+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}





var stat = fs.stat;

var isExclude = function(src, path, excludes) {
    if (excludes) {
        for (var i = 0; i < excludes.length; i++) {
            if (src + path == src + excludes[i]) {
                return true;
            }
        }
    }

    return false;
}


/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的目录
 * @param{ String } 复制到指定的目录
 */
var copy = function(src, dst, exclude) {
    // 读取目录中的所有文件/目录
    fs.readdir(src, function(err, paths) {
        if (err) {
            throw err;
        }
        paths.forEach(function(path) {
            var _src = src + '/' + path,
                _dst = dst + '/' + path,
                readable, writable;

            if (exclude) {
                if (exclude.folders) {
                    if (isExclude(src, path, exclude.folders))
                        return;
                }

                if (exclude.files) {
                    if (isExclude(src, path, exclude.files))
                        return;
                }
            }
            
            stat(_src, function(err, st) {
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
var exists = function(src, dst, exclude, callback) {
    fs.exists(dst, function(exists) {
        // 已存在
        if (exists) {
            callback(src, dst, exclude);
        }
        // 不存在
        else {
            fs.mkdir(dst, function() {
                callback(src, dst, exclude);
            });
        }
    });
};