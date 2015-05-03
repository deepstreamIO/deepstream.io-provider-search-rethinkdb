var rethinkdb = require( 'rethinkdb' ),
	Search = require( './search' ),
	DeepstreamClient = require( 'deepstream.io-client-js' ),
	EventEmitter = require( 'events' ).EventEmitter,
	util = require( 'util' );

var Provider = function( config ) {
	this.isReady = false;
	this._config = config;
	this._rethinkDbConnection = null;
	this._deepstreamClient = null;
	this._listName = config.listName || 'search';
	this._searches = {};
};

util.inherits( Provider, EventEmitter );

Provider.prototype.start = function() {
	this._initialiseDbConnection();
};

Provider.prototype.stop = function() {
	this._deepstreamClient.close();
	this._rethinkDbConnection.close();
};

Provider.prototype._initialiseDbConnection = function() {
	this._log( 'Initialising RethinkDb Connection' );

	if( this._config.rethinkDbConnection ) {
		this._rethinkDbConnection = this._config.rethinkDbConnection;
		this._initialiseDeepstreamClient();
	} else {
		if( !this._config.rethinkdbConnectionParams ) {
			throw new Error( 'Can\'t connect to rethinkdb, neither connection nor connection parameters provided' );
		}

		rethinkdb.connect( this._config.rethinkdbConnectionParams, this._onRethinkdbConnection.bind( this ) );
	}
};

Provider.prototype._onRethinkdbConnection = function( error, connection ) {
	if( error ) {
		throw new Error( 'Error while connecting to RethinkDb: ' + error.toString() );
	} else {
		this._log( 'RethinkDb connection established' );
		this._rethinkDbConnection = connection;
		this._initialiseDeepstreamClient();
	}
};

Provider.prototype._initialiseDeepstreamClient = function() {
	this._log( 'Initialising Deepstream connection' );
	
	if( this._config.deepstreamClient ) {
		this._deepstreamClient = this._config.deepstreamClient;
		this._log( 'Deepstream connection established' );
		this._ready();
	} else {
		if( !this._config.deepstreamUrl ) {
			throw new Error( 'Can\'t connect to deepstream, neither deepstreamClient nor deepstreamUrl where provided' );
		}

		if( !this._config.deepstreamCredentials ) {
			throw new Error( 'Missing configuration parameter deepstreamCredentials' );
		}

		this._deepstreamClient = new DeepstreamClient( this._config.deepstreamUrl );
		this._deepstreamClient.login( this._config.deepstreamCredentials, this._onDeepstreamLogin.bind( this ) );
	}
};

Provider.prototype._onDeepstreamLogin = function( success, error, message ) {
	if( success ) {
		this._log( 'Connection to deepstream established' );
		this._ready();
	} else {
		this._log( 'Can\'t connect to deepstream: ' + message );
	}
};

Provider.prototype._onSubscription = function( name, subscribed ) {
	this._log( 'received subscription for ' + name );

	var parsedInput = this._parseInput( name ),
		query;

	// don't process invalid queries
	if( parsedInput === null ) {
		return;
	}

	query = this._createQuery( parsedInput );

	if( subscribed === true ) {
		if( !this._searches[ name ] ) {
			this._searches[ name ] = new Search( query, name, this._rethinkDbConnection, this._deepstreamClient );
		}

		this._searches[ name ].subscriptions++;
	} else {
		if( this._searches[ name ] ) {
			this._searches[ name ].subscriptions--;

			if( this._searches[ name ].subscriptions === 0 ) {
				this._searches[ name ].destroy();
				delete this._searches[ name ];
			}
		}	
	}
};

/**
 * Parses the query string, queries are expected to
 * be send as JSON. The full name would look like this
 *
 * search?{ "table": "people", "query": [[ "name", "ma", "Wolf" ], [ "age", "gt", "25" ] ] }
 *
 * The structure is an array of filter conditions. Each filter condition
 * is expresses as [ "<field>", "<operator>", "value" ]
 *
 * Supported operators are
 *
 * "eq" (equals)
 * "match" (RegEx match)
 * "gt" (greater than)
 * "lt" (lesser than)
 * "ne" (not equal)
 * 
 * @param   {String} name The recordName for the list, including search parameters
 *
 * @returns {Object} query
 */
Provider.prototype._createQuery = function( parsedInput ) {
	var row,
		condition,
		query = null,
		i;

	for( i = 0; i < parsedInput.query.length; i++ ) {
		condition = parsedInput.query[ i ];

		row = rethinkdb.row( '_d' )( condition[ 0 ] )[ condition[ 1 ] ]( condition[ 2 ] );

		if( query === null ) {
			query = row;
		} else {
			query = query.and( row );
		}
	}

	return { table: parsedInput.table, filter: query };
};


Provider.prototype._parseInput = function( input ) {
	
	var operators = [ 'eq', 'match', 'gt', 'lt', 'ne'],
		search,
		parsedInput,
		condition,
		i;

	if( input.indexOf( '?' ) === -1 ) {
		return this._queryError( input, 'Missing ?' );
	}

	search = input.split( '?' )[ 1 ];

	try{
		parsedInput = JSON.parse( search );
	} catch( e ) {
		return this._queryError( input, 'Invalid JSON' );
	}

	if( !parsedInput.table ) {
		return this._queryError( input, 'Missing parameter "table"' );
	}

	if( !parsedInput.query ) {
		return this._queryError( input, 'Missing parameter "query"' );
	}

	for( i = 0; i < parsedInput.query.length; i++ ) {
		condition = parsedInput.query[ i ];

		if( condition.length !== 3 ) {
			return this._queryError( input, 'Too few parameters' );
		}

		if( operators.indexOf( condition[ 1 ] ) === -1 ) {
			return this._queryError( input, 'Unknown operator ' + condition[ 1 ] );
		}
	}

	return parsedInput;
};

Provider.prototype._queryError = function( name, error ) {
	this._log( name );
	this._log( 'QUERY ERROR | ' + error );
	return null;
};

Provider.prototype._ready = function() {
	var pattern = this._listName + '[\\?].*';
	this._log( 'listening for ' + pattern );
	this._deepstreamClient.record.listen( pattern, this._onSubscription.bind( this ) );
	this._log( 'rethinkdb search provider ready' );
	this.isReady = true;
	this.emit( 'ready' );
};

Provider.prototype._log = function( message ) {
	var date = new Date(),
		time = date.toLocaleTimeString() + ':' + date.getMilliseconds();
	
	//console.log( time + ' | ' + message );
};

module.exports = Provider;