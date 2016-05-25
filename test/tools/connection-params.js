exports.rethinkdb = {
	host: process.env.RETHINK_HOST || '192.168.99.100',
	port: 28015,
	db: 'search_provider_test'
};
exports.primaryKey = 'ds_id';
exports.testTable = 'test';
exports.deepstreamUrl = 'localhost:6021';
exports.deepstreamCredentials = { username: 'rethinkdb-search-provider' };
