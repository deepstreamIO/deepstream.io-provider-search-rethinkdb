var rethinkdb = require( 'rethinkdb' );


var QueryParser = function( provider ) {
	this._provider = provider;
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
 * @todo  Support for OR might come in handy
 *
 * @param   {String} name The recordName for the list, including search parameters
 *
 * @public
 * @returns {Object} query
 */
QueryParser.prototype.createQuery = function( parsedInput ) {
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
 * @public
 * @returns {Object) parsedInput
 */
QueryParser.prototype.parseInput = function( input ) {

	var operators = [ 'eq', 'match', 'gt', 'lt', 'ne'],
		search,
		parsedInput,
		condition,
		i;


	if( input.indexOf( '?' ) === -1 ) {
		return this._queryError( input, 'Missing ?' );
	}

	search = input.substring( input.indexOf( '?' ) + 1 );

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
QueryParser.prototype._queryError = function( name, error ) {
	this._provider.log( name, 1 );
	this._provider.log( 'QUERY ERROR | ' + error, 1 );
	return null;
};

module.exports = QueryParser;
