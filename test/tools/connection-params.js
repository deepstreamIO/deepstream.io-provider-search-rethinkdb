exports.rethinkdb = {
	host: process.env.RETHINKDB_HOST || 'localhost',
	port: 28015,
	db: 'search_provider_test'
};
exports.primaryKey = 'ds_id';
exports.testTable = 'test';
exports.deepstreamUrl = 'localhost:6021';
exports.deepstreamCredentials = { username: 'rethinkdb-search-provider' };
