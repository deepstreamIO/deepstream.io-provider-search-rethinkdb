const r = require( 'rethinkdb' )
const PRIMARY_KEY = 'ds_id'

/**
 * This class represents a single realtime search query against RethinkDb.
 *
 * It creates two cursors, one to
 * retrieve the initial matches, one to listen for incoming changes. It then
 * creates a deepstream list and populates it with the changes
 *
 * Important: Deepstream notifies this provider once all subscriptions for list have been
 * removed - which presents a conundrum since the provider is a subscriber in its own right,
 * so will never be notified. Instead it listens to the list being deleted - which isn't an ideal
 * solution since it either requires namespacing the lists with a username or deleting the lists
 * for all subscribers.
 *
 * @constructor
 *
 * @param {Provider} provider
 * @param {Object} query               The query as returned by _createQuery
 * @param {String} listName            The full name of the list that the client subscribed to
 * @param {Connection} rethinkdbConnection
 * @param {DeepstreamClient} deepstreamClient
 */
var Search = function( provider, query, listName, rethinkdbConnection, deepstreamClient ) {
  this.subscriptions = 0

  this._provider = provider
  this._list = deepstreamClient.record.getList( listName )
  this._changeFeedCursor = null
  this._initialValues = Object.create( null ) // new Set() would be better

  query( PRIMARY_KEY )
    .changes({ includeStates: true, includeInitial: true, squash: false })
    .run( rethinkdbConnection, this._onChange.bind( this ) )
}

/**
 * Closes the RethinkDb change feed cursor. It also deletes the list if called
 * as a result of an unsubscribe call to the record listener, but not if called
 * as a result of the list being deleted.
 *
 * @public
 * @returns {void}
 */
Search.prototype.destroy = function() {

  if( this._list ) {
    this._provider.log( 'Removing search ' + this._list.name )
    this._list.delete()
    this._list = null
  }

  if( this._changeFeedCursor ) {
    this._changeFeedCursor.close()
    this._changeFeedCursor = null
  }
}

/**
 * Processes an incoming change notification. This might be a new
 * document matching the search criteria or an existing one not matching them
 * any longer
 *
 * @param   {RqlRuntimeError} error or null
 * @param   {change feed cursor} cursor
 *
 * @private
 * @returns {void}
 */
Search.prototype._onChange = function( error, cursor ) {
  if( error ) {
    if( this._initialValues ) {
      this._onError( 'Error while retrieving initial value: ' + error.toString() )
    } else {
      this._onError( 'Error while receiving change notification: ' + error )
    }
  } else {
    this._changeFeedCursor = cursor;
    cursor.each( this._readChange.bind( this ) )
  }
}

/**
 * Reads the incoming change document and distuinguishes
 * between "status documents" and actual changes
 *
 * @param   {RqlRuntimeError} cursorError or null
 * @param   {Object} change   A map with an old_val and a new_val key
 *
 * @returns {void}
 */
Search.prototype._readChange = function( cursorError, change ) {
  if( cursorError ) {
    this._onError( 'cursor error on change: ' + cursorError.toString() )
  }
  else if( change.state ) {
    if( change.state === 'ready' ) {
      this._populateList()
    }
  }
  else {
    if( this._initialValues ) {
      this._processInitialValues( change )
    } else {
      this._processChange( change )
    }
  }
}

/**
 * Retrieves the primary keys from the list of retrieved documents
 * and populates the list with them
 *
 * @param   {Array} values    the full retrieved documents
 *
 * @private
 * @returns {void}
 */
Search.prototype._populateList = function() {
  var recordNames = [],
    k

  for( k in this._initialValues ) {
    if( Object.prototype.hasOwnProperty.call( this._initialValues, k ) ) {
      recordNames.push( k )
    }
  }
  delete this._initialValues;

  this._provider.log( 'Found ' + recordNames.length + ' initial matches for ' + this._list.name, 3 )
  this._list.setEntries( recordNames )
}

/**
 * Adds/removes initial values till rethink declares the values ready
 *
 * @param   {Object} change   A map with an old_val and a new_val key
 *
 * @private
 * @returns {void}
 */
Search.prototype._processInitialValues = function( change ) {
  if( change.new_val ) {
    this._provider.log( 'Added 1 initial entry to ' + this._list.name, 3 )
    this._initialValues[ change.new_val ] = true
  }

  if( change.old_val ) {
    this._provider.log( 'Removed 1 initial entry from ' + this._list.name, 3 )
    delete this._initialValues[ change.old_val ]
  }
}

/**
 * Differentiates between additions and deletions
 *
 * @param   {Object} change   A map with an old_val and a new_val key
 *
 * @private
 * @returns {void}
 */
Search.prototype._processChange = function( change ) {
  // Should never occur, just in case it sends an update for an existing document
  if( change.old_val !== null && change.new_val !== null ) {
    return
  }

  if( change.old_val === null ) {
    this._provider.log( 'Added 1 new entry to ' + this._list.name, 3 )
    this._list.addEntry( change.new_val )
  }

  if( change.new_val === null ) {
    this._provider.log( 'Removed 1 entry from ' + this._list.name, 3 )
    this._list.removeEntry( change.old_val )
  }
}

/**
 * Error callback
 *
 * @param   {String} error
 *
 * @private
 * @returns {void}
 */
Search.prototype._onError = function( error ) {
  this._provider.log( 'Error for ' + this._list.name + ': ' + error, 1 )
}


module.exports = Search
