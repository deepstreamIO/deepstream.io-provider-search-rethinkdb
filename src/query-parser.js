var rethinkdb = require( 'rethinkdb' )


var QueryParser = function( provider ) {
  this._provider = provider
}

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
 * "ge" (greater then or equal)
 * "lt" (lesser than)
 * "le" (lesser then or equal)
 * "ne" (not equal)
 * "in" (matches a member of supplied array)
 *
 * @todo  Support for OR might come in handy
 * @todo  `in` doesn't take advantage of indexes where they exist, enhancement
 *
 * @param   {Object} parsedInput the output of QueryParser.prototype.parseInput
 *
 * @public
 * @returns {Object} prepared rethinkdb query
 */
QueryParser.prototype.createQuery = function( parsedInput ) {
  var predicate,
    condition,
    query,
    i

  query = rethinkdb.table( parsedInput.table )

  if( parsedInput.order ) {
    query = query.orderBy({ index: rethinkdb[ parsedInput.desc ? 'desc' : 'asc' ]( parsedInput.order ) })
  }

  for( i = 0; i < parsedInput.query.length; i++ ) {
    condition = parsedInput.query[ i ]

    if( condition[ 1 ] !== 'in' ) {
      predicate = this._getRow( condition[ 0 ] )[ condition[ 1 ] ]( condition[ 2 ] )
    } else {
      predicate = function( record ) {
        return rethinkdb.expr( condition[ 2 ] ).contains( record( condition[ 0 ] ) )
      }
    }

    query = query.filter( predicate )
  }

  query = query( this._provider.primaryKey )

  if( parsedInput.limit ) {
    query = query.limit( parsedInput.limit )
  }

  return query
}

/**
 * Receives a string like
 *
 * search?{ "table": "people", "query": [[ "name", "ma", "Wolf" ], [ "age", "gt", "25" ] ] }
 *
 * cuts off the search? part and parses the rest as JSON. Validates the resulting structure.
 *
 * @param   {String} input the name of the list the user subscribed to
 *
 * @public
 * @returns {Object) parsedInput
 */
QueryParser.prototype.parseInput = function( input ) {

  var operators = [ 'eq', 'match', 'gt', 'ge', 'lt', 'le', 'ne', 'in' ],
    search,
    parsedInput,
    condition,
    i,
    index,
    valueIsArray

  index = input.indexOf( '?' )
  if( index === -1 ) {
    return this._queryError( input, 'Missing ?' )
  }

  search = input.substr(index + 1)

  try{
    parsedInput = JSON.parse( search )
  } catch( e ) {
    return this._queryError( input, 'Invalid JSON' )
  }

  if( !parsedInput.table ) {
    return this._queryError( input, 'Missing parameter "table"' )
  }

  if( !parsedInput.query ) {
    return this._queryError( input, 'Missing parameter "query"' )
  }

  if( !parsedInput.order != !parsedInput.limit ) { // XOR
    return this._queryError( input, 'Must specify both "order" and "limit" together' );
  }

  for( i = 0; i < parsedInput.query.length; i++ ) {
    condition = parsedInput.query[ i ]

    if( condition.length !== 3 ) {
      return this._queryError( input, 'Too few parameters' )
    }

    if( operators.indexOf( condition[ 1 ] ) === -1 ) {
      return this._queryError( input, 'Unknown operator ' + condition[ 1 ] )
    }

    // could use Array.isArray instead if supported
    valueIsArray = Object.prototype.toString.call( condition[ 2 ] ) === '[object Array]'
    if( condition[ 1 ] === 'in' && !valueIsArray ) {
      return this._queryError( input, '\'in\' operator requires a JSON array')
    }
  }

  return parsedInput
}

/**
 * Logs query errors
 *
 * @param   {String} name
 * @param   {String} error
 *
 * @private
 * @returns null
 */
QueryParser.prototype._queryError = function( name, error ) {
  this._provider.log( name, 1 )
  this._provider.log( 'QUERY ERROR | ' + error, 1 )
  return null
}

/**
 * Creates a ReQL row statement out of a simple or nested path
 *
 * @param   {String} path the path to search for
 *
 * @private
 * @returns {[ReQL.Row]} ReQL row object
 */
QueryParser.prototype._getRow = function( path ) {
  var parts = path.split( /[\[\]\.]/g ).filter( val => val.trim().length > 0 )
  var row = rethinkdb.row( parts[ 0 ] );

  for( var i = 1; i < parts.length; i++ ) {
    row = row( parts[ i ] );
  }

  return row;
};

module.exports = QueryParser
