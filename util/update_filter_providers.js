/*
* This script adds a provider to an initiative in the initiatives() function within the library_functions 
* collection of the hQuery database. 
* 
* The script takes exactly two arguements. 1) the provider id to add, 2) the initiative to add them to.
*
* If the initiative does not exisit then it is created. If the provider is already part of the initiative
* then they are not added.
* 
* Usage: $ node update_filter_providers.js <PROVIDER_ID> <INITIATIVE_ID> 
*/


var mongoose = require('mongoose');
var util = require('util'); 

if(process.argv.length !== 4){
	console.log("Usage: $ node script_name.js <CLINICIAN_ID> <INITIATIVE_NAME>"); 
	process.exit(1); 
}

var PROVIDER = process.argv[2];
var INIT = process.argv[3].toUpperCase();

var MONGO = process.env.MONGO_URI || "mongodb://hubdb:27017/query_composer_development"; 

mongoose.connect(MONGO); 

var db = mongoose.connection; 

var functionSchema = mongoose.Schema({
	name : String,
	definition : String
})

var Func = mongoose.model('library_functions', functionSchema); 

var s = "function initatives(){ return $$$$; }"; 

db.once('open', function(cb){

	Func.findOne({"name":'initiatives'}, function(err, funs){

		if(err) console.log(err); 

		var fun = funs; 

		var def = fun.definition; 

		var r = RegExp(/function initatives\(\)\{\s*return\s*(\{[\s\S]*?\})\s*;\s*\}\s*$/);		

		//get the JSON from the library_function.
		var i = r.exec(def); 

		try{
			i = JSON.parse(i[1]); 
		}catch(e){
			console.log("Could not parse initiatives in database!"); 
			process.exit(1); 
		}

		if(i[INIT]){
			//only add the provider if they are not already in the array.
			if(i[INIT].indexOf(PROVIDER) < 0){
				i[INIT].push(PROVIDER);
			}
		}else{
			i[INIT] = [PROVIDER]
		}

		s = s.replace("$$$$", JSON.stringify(i)); 
		
		fun.definition = s; 

		fun.save(function(err){

			if(err){
				console.log(err);
				db.close(); 
				process.exit(1); 
			}else{
				console.log("Successfully added provider: " +PROVIDER+" to initiative: "+INIT);  
				db.close(); 
				process.exit(0); 
			}

		}); 

	}); 	

}); 
