var mongo = require('mongodb').MongoClient
  , dbConfig = { dbURL: 'mongodb://127.0.0.1:27017/chat' }

var DEBUG = true;

/**
 * 登录处理
 */
exports.doLogin = function(req, res){
	var id = parseInt(req.body.id.trim())
      , password = req.body.password.trim();

    if (DEBUG){
		req.session.user = id;
		req.session.data = JSON.stringify({name: "zzzza", avatar: "user.jpg"})
		res.cookie("user", req.body.id);

		res.redirect("/")

		return
	}

    // 账号密码不能为空
    if (id == "" || password == ""){
    	res.redirect("/login")
    	return
    }
    // 导入模块
	var sise = require("../common/sise/login")
	  , course = require("../common/sise/course")
	  , md5 = require("md5")

	// 登录处理
	sise.login(id, password, function(status, cookie) {
		// 登录结果状态判断
		if (status == 0){ // 登录失败
			res.render('login', { info: '登录失败！' });
		}else{ // 登录成功
		  	mongo.connect(dbConfig.dbURL, function(err, db) {
		    	if(err) throw err;
		    	
		    	var Users = db.collection('user');
		    	Users.find({"uid": id}).toArray(function(err, results) {

		    		// 第一次登录该系统
		    		if (results.length == 0){
		    			course.get(cookie, function(courseData){
		    				// 添加在线交流群
		    				var courseDatas = [
			    				{
			    					uid: "c4ca4238a0b923820dcc509a6f75849b",
			    					avatar: "group.png",
			    					name: "在线交流群"
			    				}
		    				]
		    				// 读取课程信息
		    				courseData[1].forEach(function(elem){
		    					courseDatas.push({
		    						uid: md5(elem.name + "@" + elem.class),
		    						avatar: "group.png",
		    						name: elem.name + " @ " + elem.class,
		    						teacher: elem.teacher,
		    						place: elem.place
		    					})
		    				})

			    			var userData = {
			    				uid: id,
			    				name: courseData[0],
			    				avatar: "user.jpg",
			    				friends: [],
			    				groups: courseDatas 
			    			}

			    			// 插入数据库中
			    			Users.insert(userData, function(err, docs) {
			        			db.close()
			        			req.session.data = JSON.stringify({name: userData.name, avatar: userData.avatar})
			        			req.session.user = id;
			        			res.cookie("user", req.body.id);
			        			res.redirect("/")
							});

		    			})
		    		}else{
		    			req.session.user = id;
		    			req.session.data = JSON.stringify({name: results[0].name, avatar: results[0].avatar})
		    			res.cookie("user", req.body.id);
		    			res.redirect("/")
		    		} // END IF (results.length == 0)
				});
			})
		}
	})
}

/**
 * 获取好友信息
 * 返回 JSON
 */
exports.getFriends = function (req, res){
	if (!req.session.user) {
		res.send("ERROR!!");
		return;
	}
	mongo.connect(dbConfig.dbURL, function(err, db) {
		var Users = db.collection('user')
		  , id = req.session.user
		Users.findOne({"uid": id}, function(err, result){
			// 查询条件
			var condition =	{
				    			uid: {
				    				$in: result.friends.concat(id)
				    			}
				    		}
			  , limit     = {
				    			"uid": 1,
				    			"name": 1,
				    			"avatar": 1,
				    			"_id": 0
				    		};

			// 返回好友信息 + 班群信息
			Users.find(condition, limit).toArray(function(err, results) {
				res.send(results)
				db.close();
			})
		})
	})
}

/**
 * 获取群组信息
 * 返回JSON
 */
exports.getGroups = function (req, res){
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var Users = db.collection('user')
		  , id = req.session.user
		var limit = {
			"_id": 0,
			"groups": 1
		}
		Users.findOne({"uid": id}, limit, function(err, result){
			res.send(result.groups)
		})
		
	})
}

/**
 * 更改个人信息
 */
exports.doUpdateInfo = function (req, res) {
	// 获取上传的文件
    var file = req.files.file
      , name = file.name
      , ext = name.substring(name.lastIndexOf("."), name.length)
      , path = file.path
      , target_path = path + ext
    // 修改保存的路径
    fs.rename(path, target_path, function (err) {
        if (err) throw err;
    });
	// 个人信息
	var newname = req.body.username
	  , newavatar = target_path.substring(target_path.lastIndexOf("\\") + 1, target_path.length)
	// 更新数据库
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var Users = db.collection('user')
		Users.update({uid: req.session.user}, {$set: {"name": newname, "avatar": newavatar}}, function(err, docs){
			res.redirect("/setting")
			db.close()
		})
	})
}

/**
 * 添加好友
 */
exports.doAddFriend = function (req, res) {
	var friendID = req.body.fid.trim()
	if (friendID.length != 10 || !friendID.match(/\d{10}/)) {
		res.send(404, "error");
		return
	}
	friendID = parseInt(friendID)
	if (req.session.user == friendID) {
		res.send(404, "error");
		return
	}
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var Users = db.collection('user')
		Users.findOne({uid: req.session.user}, function(err, doc){
			console.log(friendID)
			console.log(doc.friends)
			if (doc.friends.indexOf(friendID) == -1){
				Users.update({uid: req.session.user}, {"$push": {"friends": friendID}}, function(err, docs){
					res.redirect("/")
					db.close()
				})
			}else{
				res.send(404, "error");
			}
		})
		
	})
}

/**
 * 反馈信息处理
 */
exports.doFeedback = function(req, res){
	if (req.body.con){
    // 生成数据
		var data = {
			date: DataFormat(),
			ip: getClientIp(req),
			browser: req.headers['user-agent'],
			content: req.body.con
		}
		// 插入数据
		mongo.connect(dbConfig.dbURL, function(err, db) {
			if(err) throw err;
			var collection = db.collection('feedback');
			collection.insert(data, function(err, docs) {
        		res.send("success")
        		db.close();
			});
		})
	}
};