var r = require( 'rethinkdb' ),
	connectionParams = require( './connection-params' ),
	connection,
	callback;

module.exports = function( _callback ) {
	callback = _callback;
	r.connect( connectionParams.rethinkdb, function( error, _connection ){
		if( error ) {
			return _callback(error)
		}

		connection = _connection;
		r.dbDrop( connectionParams.rethinkdb.db ).run( connection, function(err) {
			if (err) {
				// do nothing, this just happens the first time
			}
			r.dbCreate( connectionParams.rethinkdb.db ).run(connection, function(err) {
				if (err) {
					return _callback(err)
				}
				createTable()
			})
		} );
	});
};

var createTable = function() {
	r
		.tableCreate( connectionParams.testTable, {
			primaryKey: connectionParams.primaryKey,
			durability: 'hard'
		} )
		.run( connection, fn( populateTable ) );
};

var populateTable = function( error ) {
	r.table( connectionParams.testTable ).insert([
		{ ds_id: 'don', __ds: { _v: 1 }, title: 'Don Quixote', author:	'Miguel de Cervantes', language: 'Spanish', released: 1605, copiesSold: 315000000 },
		{ ds_id: 'tct', __ds: { _v: 1 }, title: 'A Tale Of Two Cities', author: 'Charles Dickens', language: 'English', released: 1859, copiesSold: 200000000 },
		{ ds_id: 'lor', __ds: { _v: 1 }, title: 'The Lord of the Rings', author: 'J. R. R. Tolkien', language: 'English', released: 1954, copiesSold: 150000000 },
		{ ds_id: 'tlp', __ds: { _v: 1 }, title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', language: 'French', released: 1943, copiesSold: 140000000 },
		{ ds_id: 'hrp', __ds: { _v: 1 }, title: 'Harry Potter and the Philosopher\'s Stone', author: 'J. K. Rowling', language: 'English', released: 1997, copiesSold: 107000000 }
	]).run( connection, fn( complete ) );
};

var complete = function() {
	connection.close();
	callback();
};

var fn = function( cb ) {
	return function( error ) {
		if( error ) {
			cb(err)
		} else {
			cb();
		}
	};
};
