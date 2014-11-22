var mongoose = require('mongoose'),
    _ = require('lodash'),
    Result = require('./result'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    Mixed = Schema.Types.Mixed;

var schema = Schema({

processed_result:
{
  network:[
    { time: Date,
      aggregate_result:{
        denominator:Number,
        numerator:Number
      }
    }
  ],
  clinic:[
    { time: Date,
      aggregate_result:{
        denominator:Number,
        numerator:Number
      }
    }
  ],
  clinician:[
    { time: Date,
      aggregate_result:{
        denominator:Number,
        numerator:Number
      }
    }
  ],
  endpoint_id: String,
  provider_id: String
}

});
