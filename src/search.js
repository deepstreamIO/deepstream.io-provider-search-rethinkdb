var r = require( 'rethinkdb' ),
	PRIMARY_KEY = 'ds_id';

var Search = function( query, listName, rethinkdbConnection, deepstreamClient ) {
	this.subscriptions = 0;

	this._query = query;
	this._rethinkdbConnection = rethinkdbConnection;
	this._deepstreamClient = deepstreamClient;
	this._list = this._deepstreamClient.record.getList( listName );

	r
		.table( this._query.table )
		.filter( this._query.filter )
		.run( this._rethinkdbConnection, this._onInitialValues.bind( this ) );
};

Search.prototype.destroy = function() {
	this._rethinkdbConnection = null;
	this._deepstreamClient = null;
};

Search.prototype._onInitialValues = function( error, cursor ) {
	if( error ) {
		this._onError( 'Error while retrieving initial value: ' + error.toString() );
		return;
	}

	cursor.toArray(function( cursorError, values ){
		if( cursorError ) {
			this._onError( 'Error while iterating through cursor for initial values: ' + error.toString() );
		}

		this._populateList( values );
	}.bind( this ));
};

Search.prototype._subscribeToChangeFeed = function() {
	r
		.table( this._query.table )
		.filter( this._query.filter )
		.changes({includeStates: true, squash: false })
		.run( this._rethinkdbConnection, this._onChange.bind( this ) );
};

Search.prototype._populateList = function( values ) {
	var recordNames = [],
		i;

	for( i = 0; i < values.length; i++ ) {
		recordNames.push( values[ i ][ PRIMARY_KEY ] );
	}

	this._list.setEntries( recordNames );
};

Search.prototype._onChange = function( error, cursor ) {

	if( error ) {
		console.log( error );
	} else {
		cursor.each(function( cursorError, row ){
			console.log( cursorError, row );
		});
	}
};

Search.prototype._onError = function( error ) {
	console.log( error ); //TODO
};


module.exports = Search;
