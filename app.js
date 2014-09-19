
/**
 * 模块依赖
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , ejs = require('ejs');

var app = express();

// 环境变量
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('.html', ejs.__express);
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser("onewater2012")); 
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// 开发模式
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
	
// 路径解析
app.get('/', routes.index);
app.get('/feedback', routes.feedback);
app.get('/about', routes.about);
app.get('/login', routes.login);
app.get('/setting', routes.setting);
app.get('/admin', routes.admin);

app.get('/users/:id', user.list);

app.post('/do/feedback', routes.doFeedback);
app.post('/do/login', routes.doLogin);

app.get('/get/friends', routes.getFriends);
app.get('/get/groups', routes.getGroups);


// 启动及端口



var server = http.createServer(app)
server.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io')(server)
  , sockets = {}
  , mongo = require('mongodb').MongoClient
  , dbConfig = {
    	dbURL: 'mongodb://127.0.0.1:27017/chat'
    }

io.on('connection', function(socket){

	// 上线处理
	socket.on('online', function (data) {
		// TODO : 重复登录处理

		// 将上线的用户名存储为 socket 对象的属性，以区分每个 socket 对象，方便后面使用
		socket.name = data.user;
		
		// 获取用户的群ID
		mongo.connect(dbConfig.dbURL, function(err, db) {
			if(err) throw err;
			var collection = db.collection('user');
			collection.findOne({"uid": data.user}, {"groups" : 1, "_id": 0}, function(err, result) {
				result.groups.forEach(function (elem){
					if (typeof(sockets[elem.uid]) == "undefined")
						sockets[elem.uid] = []
					sockets[elem.uid].push(socket)
				})
				db.close();
			});
		})

	});

	// 消息处理
	socket.on('say', function (data) {
		// 判断信息是否群发，即是否在班群上发送的信息
		var id = data.to;
		var reg = /[a-z]/
		if (id.match(reg)) {
			console.info(sockets[data.to])
			sockets[data.to].forEach(function (client){
				if (client.name != data.from.uid){
					client.emit('say', data);
				}
			})
	    } else {
	    	var clients = io.sockets.sockets;
	    	// 遍历找到该用户
		    clients.forEach(function (client) {
		    	if (client.name == parseInt(data.to)) {
		        	// 触发该用户客户端的 say 事件
		        	client.emit('say', data);
		        }
		    });
	    } // END IF
	});

});