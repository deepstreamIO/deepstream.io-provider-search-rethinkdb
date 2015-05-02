exports.rethinkdb = {
	host: '192.168.56.101',
	port: 28015,
	db: 'deepstream'
};
exports.primaryKey = 'ds_id';
exports.testTable = 'search_provider_test';
exports.deepstreamUrl = 'localhost:6021';
exports.deepstreamCredentials = { username: 'rethinkdb-search-provider' };