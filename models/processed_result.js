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
        denominator_patients_above_19:Number,
        numerator_has_recorded_values:Number
      }
    }
  ],
  clinic:[
    { time: Date,
      aggregate_result:{
        denominator_patients_above_19:Number,
        numerator_has_recorded_values:Number
      }
    }
  ],
  clinician:[
    { time: Date,
      aggregate_result:{
        denominator_patients_above_19:Number,
        numerator_has_recorded_values:Number
      }
    }
  ],
  endpoint_id: String,
  provider_id: String
}

});
