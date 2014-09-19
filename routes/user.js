
/*
 * GET users listing.
 */

exports.list = function(req, res){
  //res.send("respond with a resource");
  res.send('user ' + req.params.id);
};