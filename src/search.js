var r = require( 'rethinkdb' );

var Search = function( query, rethinkdbConnection, deepstreamClient ) {
	this.subscriptions = 0;

	this._query = query;
	this._rethinkdbConnection = rethinkdbConnection;
	this._deepstreamClient = deepstreamClient;

	r.table( query.table ).filter( query.filter ).changes({includeStates: true}).run( rethinkdbConnection, this._onResult.bind( this ) );
};

Search.prototype.destroy = function() {
	this._rethinkdbConnection = null;
	this._deepstreamClient = null;
};

Search.prototype._onResult = function( error, cursor ) {

	if( error ) {
		console.log( error );
	} else {
		cursor.each(function( cursorError, row ){
			console.log( cursorError, row );
		});
	}
};


module.exports = Search;
