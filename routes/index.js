
/*
 * GET home page.
 */

var mongo = require('mongodb').MongoClient
    dbConfig = {
      dbURL: 'mongodb://127.0.0.1:27017/chat'
    }

exports.index = function(req, res){
	if (!req.session.user || !req.session.data) {
		res.redirect('/login')
		return
	}
	var data = req.session.data
	console.log(data)
	res.render('index', JSON.parse(data));
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


/*
    // 账号密码不能为空
    if (id == "" || password == ""){
    	res.redirect("/login")
    	return
    }

	var sise = require("../common/sise/login")
	sise.login(id, password, function(status, cookie) {
		if (status == 0){ // 登录失败
			res.render('login', { info: '登录失败！' });
		}else{ // 登录成功
			req.session.user = id;
			res.redirect("/")
		}
	})
*/

	req.session.user = id;
	res.cookie("user", req.body.id);

  	// 查询数据库是否存在该账号
  	mongo.connect(dbConfig.dbURL, function(err, db) {
    	if(err) throw err;
    	var USERS = db.collection('user');

    	USERS.find({"uid": id}).toArray(function(err, results) {

    		//console.info(results[0].friends)
    		req.session.data = JSON.stringify(results[0])


    		// 若不存在
    		if (results.length == 0){
    			// TODO: 插入数据库中
    		}

    		// 查询条件
			var condition =	{
				    			uid: {
				    				$in: results[0].friends.concat(id)
				    			}
				    		}
			  , limit     = {
				    			"uid": 1,
				    			"name": 1,
				    			"avatar": 1,
				    			"_id": 0
				    		};

			// 返回好友信息 + 班群信息
			USERS.find(condition, limit).toArray(function(err, results) {
				results.push({
					uid: 1,
					name: "在线交流群",
					avatar: "group.png"
				})
				res.cookie("friends", JSON.stringify(results));
				res.redirect("/")
				//console.log(results)
				db.close();
			})
/*
    		req.session.data = JSON.stringify(results[0])
    		res.redirect("/")*/
    		//console.info(results[0])
    		
		});
	})

	//res.redirect("/")
	
	

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
