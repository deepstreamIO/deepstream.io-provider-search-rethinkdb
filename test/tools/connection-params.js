exports.rethinkdb = {
	host: process.env.RETHINKDB_HOST || 'localhost',
	port: 28015,
	db: 'search_provider_test'
};
exports.primaryKey = 'ds_id';
exports.testTable = 'test';
exports.deepstreamUrl = 'localhost:7071';
exports.deepstreamCredentials = { username: 'rethinkdb-search-provider' };
