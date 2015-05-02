describe( 'general search provider tests', function(){
	
	it( 'creates the correct regExp', function(){
		var regExp = /search[\\?].*/;
		expect( regExp.test( 'search?{a:b}' ) ).toBe( true );
		expect( regExp.test( 'search_provider' ) ).toBe( false );
	});

});