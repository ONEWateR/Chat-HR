
exports.init = function(server){

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
				var Users = db.collection('user');
				Users.findOne({"uid": data.user}, {"groups": 1, "_id": 0, "messages": 1}, function(err, result) {
					result.groups.forEach(function (elem){
						/* 
						 * 将该用户的socket添加到群数组中，
						 * 以后发送信息只需要在该数组的每一个socket发送即可达到群聊的效果
						 */
						if (typeof(sockets[elem.uid]) == "undefined")
							sockets[elem.uid] = []
						sockets[elem.uid].push(socket)
					})
					result.messages.forEach(function (msg){
						if (msg.from.id == 10086) {
							msg.to = socket.name.toString();
						}
						socket.emit('say', msg);
					})
					
					Users.update({uid: data.user}, {"$set": {"messages": []}}, function(err, docs){
						db.close();
					})
					
				});
			})

		});

		// 消息处理
		socket.on('say', function (data) {
			// 判断信息是否群发
			var id = data.to;
			var reg = /[a-z]/
			if (id.match(reg)) {
				mongo.connect(dbConfig.dbURL, function(err, db) {

					var Groups = db.collection('groups');

					Groups.findOne({"gid": id}, function(err, result){
						var people = result.people;

						// 群发在线的
						sockets[data.to].forEach(function (client){
							if (client.name != data.from.uid){
								// 去除在线人数
								client.emit('say', data);
								people.splice(people.indexOf(client.name), 1)
							}
						});

						var Users = db.collection('user');
						people.splice(people.indexOf(data.from.uid), 1)

						for (var i = 0; i < people.length; i++) {
							Users.update({uid: people[i]}, {"$push": {"messages": data}}, function(err, docs){
								if (i == people.length - 1) 
									db.close();
							})
						};

					});

				});
				


		    } else {
		    	var clients = io.sockets.sockets;
		    	// 遍历找到该用户
			    clients.forEach(function (client) {
			    	if (client.name == parseInt(data.to)) {
			        	// 触发该用户客户端的 say 事件
			        	client.emit('say', data);
			        }
			    });
		    }
		});

		// 断开连接
		socket.on('disconnect', function() {
			for(var key in sockets){  
        		var index = sockets[key].indexOf(socket)
        		if (index != -1){
					sockets[key].splice(index, 1)
				}
    		}
		})

	});

}

