var util = require('util');
function parse(pdcString, elements, delimiter) {	
	delimiter = delimiter || '_';

	var values = pdcString.split(delimiter);
	var object = {};
	
	if(elements.length != values.length)
	{	
		throw new Error('construct requires equivalent number of fields and values');
	}

	for(var i=0; i<elements.length; i++)
	{
		object[elements[i]] = values[i];
	}

	return object;
}

/*
* Takes an array of objects and splits it on unique values of the specified field
* returns an object containing the generated arrays indexed by the field value
*
*/
function splitArray(array, field) {
	var result = {};

	for(var i=0; i<array.length; i++) {
		var element = array[i];
		
		if(!result[element[field]])
		{
			result[element[field]] = [];
		}
		
		result[element[field]].push(element);
	}

	return result;
}	

module.exports={PDCUtil:{parse:parse, splitArray:splitArray}};
