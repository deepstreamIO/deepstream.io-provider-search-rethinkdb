var rethinkdb = require( 'rethinkdb' ),
  Search = require( './search' ),
  DeepstreamClient = require( 'deepstream.io-client-js' ),
  EventEmitter = require( 'events' ).EventEmitter,
  QueryParser = require( './query-parser' ),
  util = require( 'util' );

/**
 * A data provider that provides dynamically
 * created lists based on search parameters
 * using rethinkdb
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param {Object} config please consuld README.md for details
 */
var Provider = function( config ) {
  this.isReady = false;
  this.primaryKey = config.primaryKey || 'ds_id';
  this._config = config;
  this._queryParser = new QueryParser( this );
  this._logLevel = config.logLevel !== undefined ? config.logLevel : 1;
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
 * Logs messages to StdOut
 *
 * @todo  introduce log level and (potentially) add logging
 * for every transaction
 *
 * @param   {String} message
 *
 * @public
 * @returns {void}
 */
Provider.prototype.log = function( message, level ) {
  if( this._logLevel < level ) {
    return;
  }

  var date = new Date(),
    time = date.toLocaleTimeString() + ':' + date.getMilliseconds();

  console.log( time + ' | ' + message );
};


/**
 * Creates the connection to RethinkDB. If the connection
 * is unsuccessful, an error will be thrown. If the configuration
 * contains an active connection to RethinkDb instead of connection
 * parameters, it will be used instead and the provider will move
 * on to connect to deepstream immediatly
 *
 * @private
 * @returns void
 */
Provider.prototype._initialiseDbConnection = function() {
  this.log( 'Initialising RethinkDb Connection', 1 );

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
    throw new Error( 'Error while connecting to RethinkDb: ' + error.toString(), 1 );
  } else {
    this.log( 'RethinkDb connection established', 1 );
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
  this.log( 'Initialising Deepstream connection', 1 );

  if( this._config.deepstreamClient ) {
    this._deepstreamClient = this._config.deepstreamClient;
    this.log( 'Deepstream connection established', 1 );
    this._ready();
  } else {
    if( !this._config.deepstreamUrl ) {
      throw new Error( 'Can\'t connect to deepstream, neither deepstreamClient nor deepstreamUrl were provided', 1 );
    }

    if( !this._config.deepstreamCredentials ) {
      throw new Error( 'Missing configuration parameter deepstreamCredentials', 1 );
    }

    this._deepstreamClient = new DeepstreamClient( this._config.deepstreamUrl );
    this._deepstreamClient.on( 'error', function( error ) {
      console.log( error )
    } );
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
    this.log( 'Connection to deepstream established', 1 );
    this._ready();
  } else {
    this.log( 'Can\'t connect to deepstream: ' + message, 1 );
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
  this.log( 'listening for ' + pattern, 1 );
  this._deepstreamClient.record.listen( pattern, this._onSubscription.bind( this ) );
  this.log( 'rethinkdb search provider ready', 1 );
  this.isReady = true;
  this.emit( 'ready' );
};

/**
 * Callback for the 'listen' method. Gets called everytime a new
 * subscription to the specified pattern is made. Parses the
 * name and - if its the first subscription made to this pattern -
 * creates a new instance of Search
 *
 *
 * @param   {String} name       The listname the client subscribed to
 * @param   {Boolean} subscribed Whether a subscription had been made or removed.
 *
 * @private
 * @returns {void}
 */
Provider.prototype._onSubscription = function( name, subscribed, response ) {

  if( subscribed ) {
    response.accept();
    this.log( 'received subscription for ' + name, 2 );
    this._onSubscriptionAdded( name );
  } else {
    this.log( 'discard subscription for ' + name, 2 );
    this._onSubscriptionRemoved( name );
  }


};

/**
 * When a search has been started
 *
 * @private
 * @returns {void}
 */
Provider.prototype._onSubscriptionAdded = function( name ) {
  var parsedInput = this._queryParser.parseInput( name ),
      query;

  if( parsedInput === null ) {
    return;
  }

  query = this._queryParser.createQuery( parsedInput );
  this._searches[ name ] = new Search( this, query, name, this._rethinkDbConnection, this._deepstreamClient );
};

/**
 * When a search has been removed
 *
 * @private
 * @returns {void}
 */
Provider.prototype._onSubscriptionRemoved = function( name ) {
  this._searches[ name ].destroy();
  delete this._searches[ name ];
};

module.exports = Provider;
