
/*
 * GET home page.
 */

var mongo = require('mongodb').MongoClient
    dbConfig = {
      dbURL: 'mongodb://127.0.0.1:27017/chat'
    }

exports.index = function(req, res){
	if (!req.session.user) {
		res.redirect('/login')
		return
	}
	/*
	var data = req.session.data
	console.log(data)
	res.render('index', JSON.parse(data));*/
	res.render('index', {name: "a", avatar: "aaa"})
};

exports.feedback = function(req, res){
	res.render('feedback', { title: 'Express' });
};

exports.about = function(req, res){
	res.render('about');
};

exports.admin = function(req, res){
	var fbdata = {};
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
		var collection = db.collection('feedback');
		collection.find().toArray(function(err, results) {
			fbdata = eval(results)
			res.render('admin', {
				FBdata : eval(results) // 反馈信息
			});
			db.close();
		});
	})

	
};

exports.login = function(req, res){
	res.render('login');
};

exports.setting = function(req, res){
	res.render('setting');
};


// 登陆处理
exports.doLogin = function(req, res){
	var id = parseInt(req.body.id.trim())
      , password = req.body.password.trim();

	req.session.user = id;
	res.cookie("user", req.body.id);
	res.redirect("/")

	return

    // 账号密码不能为空
    if (id == "" || password == ""){
    	res.redirect("/login")
    	return
    }

	var sise = require("../common/sise/login")
	  , course = require("../common/sise/course")
	  , md5 = require('MD5');

	sise.login(id, password, function(status, cookie) {

		// 登录处理
		if (status == 0){ // 登录失败
			res.render('login', { info: '登录失败！' });
		}else{ // 登录成功

		  	mongo.connect(dbConfig.dbURL, function(err, db) {
		    	if(err) throw err;
		    	
		    	var Users = db.collection('user');
		    	Users.find({"uid": id}).toArray(function(err, results) {

		    		//console.info(results[0].friends)
		    		
		    		// 第一次登录该系统
		    		if (results.length == 0){
		    			course.get(cookie, function(courseData){
		    				var courseDatas = [
			    				{
			    					uid: "C4CA4238A0B923820DCC509A6F75849B",
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

			    			// 插入数据库中
			    			var userData = {
			    				uid: id,
			    				name: courseData[0],
			    				avatar: "user.jpg",
			    				friends: [],
			    				groups: courseDatas 
			    			}

			    			Users.insert(userData, function(err, docs) {
			        			db.close()
			        			req.session.data = JSON.stringify(userData)
			        			req.session.user = id;
			        			res.redirect("/")
							});

		    			})
		    		}else{
		    			req.session.user = id;
		    			req.session.data = JSON.stringify(results[0])
		    			res.redirect("/")
		    		} // END IF (results.length == 0)
		    		
				});
			})

		}
	})


	
	//res.cookie("user", req.body.id);



	//res.redirect("/")
	
	

}


exports.getFriends = function (req, res){
	mongo.connect(dbConfig.dbURL, function(err, db) {
		if(err) throw err;
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

function authentication(req, res) {
	if (!req.session.user) {
		 return res.redirect('/login');
	}
}

// 反馈信息处理
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



// 获取客户端IP
function getClientIp(req) {
	return req.headers['x-forwarded-for'] ||
	req.connection.remoteAddress ||
	req.socket.remoteAddress ||
	req.connection.socket.remoteAddress;
};

// 时间格式转换，格式 yyyy/mm/dd
function DataFormat() {
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
