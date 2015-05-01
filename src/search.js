var r = require( 'rethinkdb' ),
	PRIMARY_KEY = 'ds_id';

var Search = function( query, listName, rethinkdbConnection, deepstreamClient ) {
	this.subscriptions = 0;

	this._query = query;
	this._rethinkdbConnection = rethinkdbConnection;
	this._deepstreamClient = deepstreamClient;
	this._list = this._deepstreamClient.record.getList( listName );
	this._initialCursor = null;
	this._changeFeedCursor = null;

	r
		.table( this._query.table )
		.filter( this._query.filter )
		.run( this._rethinkdbConnection, this._onInitialValues.bind( this ) );
};

Search.prototype.destroy = function() {console.log( 'DESTROY' );
	this._list.delete();
	this._changeFeedCursor.close();
	this._changeFeedCursor = null;
	this._list = null;
	this._rethinkdbConnection = null;
	this._deepstreamClient = null;
};

Search.prototype._onInitialValues = function( error, cursor ) {
	if( error ) {
		this._onError( 'Error while retrieving initial value: ' + error.toString() );
	} else {
		this._initialCursor = cursor;
		cursor.toArray( this._processInitialValues.bind( this ) );
	}
};

Search.prototype._processInitialValues = function( cursorError, values ){
	if( cursorError ) {
		this._onError( 'Error while iterating through cursor for initial values: ' + error.toString() );
	} else {
		this._initialCursor.close();
		this._populateList( values );
		this._subscribeToChangeFeed();
	}
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
		this._onError( 'Error while receiving change notification: ' + error );
	} else {
		this._changeFeedCursor = cursor;
		cursor.each( this._readChange.bind( this ) );
	}
};

Search.prototype._readChange = function( cursorError, change ) {
	/*
	 * Since {includeStates: true} is set, rethinkDb will emit 
	 * state documents, consisting only of the field state and a valua of
	 * either 'initial' or 'ready'.
	 *
	 * Since the filter command doesn't produce initial states, only
	 * ready is relevant for us
	 */
	if( change.state ) {
		if( change.state === 'ready' ) {
			this._changeFeedReady = true;
		}
	}

	else if( cursorError ) {
		this._onError( 'cursor error on change: ' + cursorError.toString() );
	}

	else {
		if( this._changeFeedReady === true ) {
			this._processChange( change );
		}
	}
};

Search.prototype._processChange = function( change ) {
	// Should never occur, just in case it sends an update for an existing document
	if( change.old_val !== null && change.new_val !== null ) {
		return;
	}

	if( change.old_val === null ) {
		this._list.addEntry( change.new_val[ PRIMARY_KEY ] );
	}

	if( change.new_val === null ) {
		this._list.removeEntry( change.old_val[ PRIMARY_KEY ] );
	}
};

Search.prototype._onError = function( error ) {
	console.log( error ); //TODO
};


module.exports = Search;
