var rethinkdb = require( 'rethinkdb' ),
	Search = require( './search' ),
	DeepstreamClient = require( 'deepstream.io-client-js' ),
	EventEmitter = require( 'events' ).EventEmitter,
	util = require( 'util' );

/**
 * A data provider that provides dynamically
 * created lists based on search parameters
 * using rethinkdb
 *
 * 
 * @author Wolfram Hempel
 * @license MIT
 *
 * @constructor
 * @extends EventEmitter
 * 
 * @param {Object} config please consuld README.md for details
 */
var Provider = function( config ) {
	this.isReady = false;
	this._config = config;
	this._rethinkDbConnection = null;
	this._deepstreamClient = null;
	this._listName = config.listName || 'search';
	this._searches = {};
};

util.inherits( Provider, EventEmitter );

/**
 * Starts the provider. The provider will emit a
 * 'ready' event once started
 *
 * @public
 * @returns void
 */
Provider.prototype.start = function() {
	this._initialiseDbConnection();
};

/**
 * Stops the provider. Closes the deepstream
 * connection and disconnects from RethinkDb
 *
 * @public
 * @returns void
 */
Provider.prototype.stop = function() {
	this._deepstreamClient.close();
	this._rethinkDbConnection.close();
};

/**
 * Creates the connection to RethinkDb. If the connection
 * is unsuccessful, an error will be thrown. If the configuration
 * contains an active connection to RethinkDb instead of connection
 * parameters, it will be used instead and the provider will move
 * on to connect to deepstream immediatly
 *
 * @private
 * @returns void
 */
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

/**
 * Callback for established RethinkDb connections. Initialises the deepstream connection
 *
 * @param {RqlDriverError} error (or null for no error)
 * @param {RethinkdbConnection} connection
 * 
 * @private
 * @returns void
 */
Provider.prototype._onRethinkdbConnection = function( error, connection ) {
	if( error ) {
		throw new Error( 'Error while connecting to RethinkDb: ' + error.toString() );
	} else {
		this._log( 'RethinkDb connection established' );
		this._rethinkDbConnection = connection;
		this._initialiseDeepstreamClient();
	}
};

/**
 * Connect to deepstream via TCP. If an active deepstream connection
 * is provided instead of connection parameters, it will be used and the provider
 * moves on to the final step of the initialisation sequence immediatly
 *
 * @private
 * @returns void
 */
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

/**
 * Callback for logins. If the login was successful the provider moves on
 * to the final step of the initialisation sequence.
 *
 * @param {Boolean} success
 * @param {String} error A deepstream error constant
 * @param {String} message The message returned by the permissionHandler
 *
 * @private
 * @returns void
 */
Provider.prototype._onDeepstreamLogin = function( success, error, message ) {
	if( success ) {
		this._log( 'Connection to deepstream established' );
		this._ready();
	} else {
		this._log( 'Can\'t connect to deepstream: ' + message );
	}
};

/**
 * Last step in the initialisation sequence. Listens for the specified pattern and emits
 * the ready event
 *
 * @private
 * @returns void
 */
Provider.prototype._ready = function() {
	var pattern = this._listName + '[\\?].*';
	this._log( 'listening for ' + pattern );
	this._deepstreamClient.record.listen( pattern, this._onSubscription.bind( this ) );
	this._log( 'rethinkdb search provider ready' );
	this.isReady = true;
	this.emit( 'ready' );
};

/**
 * Callback for the 'listen' method. Gets called everytime a new
 * subscription to the specified pattern is made. Parses the
 * name and - if its the first subscription made to this pattern -
 * creates a new instance of Search
 *
 * @todo The counting of supscriptions might be redundant since
 * deepstream will already take care of unique subscriptions. It
 * doesn't hurt much to leave it in, but lets keep an eye on it
 *
 * @param   {String} name       The listname the client subscribed to
 * @param   {Boolean} subscribed Whether a subscription had been made or removed.
 *
 * @private
 * @returns {void}
 */
Provider.prototype._onSubscription = function( name, subscribed ) {
	if( subscribed ) {
		this._log( 'received subscription for ' + name );
	} else {
		this._log( 'discard subscription for ' + name );
	}
	
	var parsedInput = this._parseInput( name ),
		query;

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
 * @private
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

/**
 * Receives a string like
 *
 * search?{ "table": "people", "query": [[ "name", "ma", "Wolf" ], [ "age", "gt", "25" ] ] }
 *
 * cuts of the search? part and parses the rest as JSON. Validates the resulting structure.
 *
 * @param   {String} input the name of the list the user subscribed to
 *
 * @private
 * @returns {Object) parsedInput
 */
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

/**
 * Logs query errors
 *
 * @param   {String} name
 * @param   {String} error
 *
 * @private
 * @returns null
 */
Provider.prototype._queryError = function( name, error ) {
	this._log( name );
	this._log( 'QUERY ERROR | ' + error );
	return null;
};

/**
 * Logs messages to StdOut
 *
 * @todo  introduce log level and (porentially) add logging
 * for every transaction
 *
 * @param   {String} message
 *
 * @private
 * @returns {void}
 */
Provider.prototype._log = function( message ) {
	var date = new Date(),
		time = date.toLocaleTimeString() + ':' + date.getMilliseconds();
	
	console.log( time + ' | ' + message );
};

module.exports = Provider;