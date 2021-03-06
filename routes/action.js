var mongo = require('../common/mongo')
  , fs = require('fs')
  , blacklist = require('../common/blacklist')

var DEBUG = true;

/**
 * 登录处理
 */
exports.doLogin = function(req, res){
	if (!blacklist.check(req, 5, 5)){
		res.send(404)
		return;
	}

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
	var sise = require("../common/sise")
	  , md5 = require("md5")

	// 登录处理
	sise.login(id, password, function(status, cookie) {
		// 登录结果状态判断
		if (status == 0){ // 登录失败
			res.send(404)
		}else{ // 登录成功
		  	mongo.connect(function(err, db) {
		    	if(err) mongo.error(err);
		    	
		    	var Users = db.collection('user');
		    	Users.find({"uid": id}).toArray(function(err, results) {

		    		// 统计登录
		    		var statistics = db.collection('statistics')
		    		var data = {"uid" : id, date : new Date().getTime()}
		    		statistics.insert(data, function(err, docs) {})

		    		if (results.length == 0){
		    			// 第一次登录该系统，获取用户信息并写入至数据库
		    			sise.getCourseInfo(cookie, function(courseInfo){

				    		var Groups = db.collection('groups');
		    				var groupsData = []

							// 读取课程信息
		    				var tempHash = {} // 避免出现重复班群

		    				courseInfo.courseData.forEach(function(elem){
		    					var md5ID = md5(elem.name + "@" + elem.class)
		    					if (tempHash[md5ID] == null){

				    				Groups.findOne({"gid": md5ID}, function(err, result){
				    					if (result == null){
				    						Groups.insert({"gid": md5ID, "people": [id]}, function(err, docs) {})
				    					}else{
				    						Groups.update({"gid": md5ID}, 
				    									  {"$push": {"people": id}},
				    									  function(err, docs) {})
				    					}
				    				})

			    					groupsData.push({
			    						uid: md5ID,
			    						avatar: "group.png",
			    						name: elem.name + " @ " + elem.class,
			    						teacher: elem.teacher,
			    						place: elem.place
			    					})
			    					tempHash[md5ID] = true;
		    					}
		    				})

			    			var userData = {
			    				uid: id,
			    				name: courseInfo.username,
			    				avatar: "user.jpg",
			    				friends: [],
			    				groups: groupsData 
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
	mongo.connect(function(err, db) {
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
	mongo.connect(function(err, db) {
		if(err) mongo.error(err);
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
	mongo.connect(function(err, db) {
		if(err) mongo.error(err);
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
	mongo.connect(function(err, db) {
		if(err) mongo.error(err);
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
	if (!blacklist.check(req, 5, 10)){
		res.send(404)
		return;
	}
	if (req.body.con){
    	// 生成数据
		var data = {
			date: DateFormat(),
			ip: req.ip,
			browser: req.headers['user-agent'],
			content: req.body.con
		}
		// 插入数据
		mongo.connect(function(err, db) {
			if(err) mongo.error(err);
			var collection = db.collection('feedback');
			collection.insert(data, function(err, docs) {
        		res.send("success")
        		db.close();
			});
		})
	}
};

/**
 * 管理员信息群发
 */
exports.doMassByAdmin = function(req, res){
	if (req.ip != "127.0.0.1") return;
	if (req.body.con){
		var data = {
			from: {
                uid: 10086,
                name: "萌萌的管理员",
                avatar: "admin.png"
            },
			con: req.body.con,
        	date: new Date()
		}
		// 插入数据
		mongo.connect(function(err, db) {
			var Users = db.collection('user');
			Users.update({}, {"$push": {"messages": data}}, {multi: true}, function(err, docs){
				res.send("success")
        		db.close();
			});
		})
	}
}

/**
 * 时间格式转换，格式 yyyy/mm/dd
 */
function DateFormat() {
	var now = new Date()
	  , y = now.getFullYear()
	  , m = now.getMonth() + 1
	  , d = now.getDate()
	  , result = "";
	result += y;
	result += "/"
	result += m < 10 ? "0" + m : m;
	result += "/"
	result += d < 10 ? "0" + d : d;
	return result;
}
