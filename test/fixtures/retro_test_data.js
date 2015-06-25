var x = {
    "_id": {
        "$oid": "55887a3aadf722c9e61f5c4e"
    },
    "title": "PDC-1738",
    "_type": "Query",
    "user_id": {
        "$oid": "5575e2bcecc133629d9d86b9"
    },
    "description": "PDC-1738_active-patients",
    "reduce": "function reduce(key, values){return Array.sum(values);}",
    "map": "/**\n * Query Title: PDC-1738\n * Query Type:  Ratio\n * Description: The ratio of active to inactive patients.\n */\nfunction map( patient ){\n\n  var denominator = true; \n\n  var numerator = denominator && activePatient( patient ); \n\n  emit( \"denominator_\" + patient.json.primary_care_provider_id,  + denominator );\n\n  emit( \"numerator_\" + patient.json.primary_care_provider_id, + numerator   );\n  \n}",
    "__v": 0,
    "executions": [
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1420143132,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 10,
                "denominator_cpsid2": 20,
                "denominator_cpsid3": 30,
                "denominator_cpsid4": 40,
                "numerator_cpsid": 8,
                "numerator_cpsid2": 16,
                "numerator_cpsid3": 24,
                "numerator_cpsid4": 32
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1421352732,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 10,
                "denominator_cpsid2": 20,
                "denominator_cpsid3": 30,
                "denominator_cpsid4": 40,
                "numerator_cpsid": 8,
                "numerator_cpsid2": 16,
                "numerator_cpsid3": 24,
                "numerator_cpsid4": 32
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1422821532,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 11,
                "denominator_cpsid2": 21,
                "denominator_cpsid3": 31,
                "denominator_cpsid4": 40,
                "numerator_cpsid": 9,
                "numerator_cpsid2": 17,
                "numerator_cpsid3": 25,
                "numerator_cpsid4": 32
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1424031132,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 15,
                "denominator_cpsid2": 22,
                "denominator_cpsid3": 32,
                "denominator_cpsid4": 41,
                "numerator_cpsid": 13,
                "numerator_cpsid2": 18,
                "numerator_cpsid3": 26,
                "numerator_cpsid4": 33
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1425240732,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 15,
                "denominator_cpsid2": 22,
                "denominator_cpsid3": 32,
                "denominator_cpsid4": 41,
                "numerator_cpsid": 13,
                "numerator_cpsid2": 18,
                "numerator_cpsid3": 26,
                "numerator_cpsid4": 33
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1426446732,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 15,
                "denominator_cpsid2": 22,
                "denominator_cpsid3": 32,
                "denominator_cpsid4": 41,
                "numerator_cpsid": 13,
                "numerator_cpsid2": 18,
                "numerator_cpsid3": 26,
                "numerator_cpsid4": 33
            }
        },
        {
            "_id": {
                "$oid": "55887a4f526153a979000001"
            },
            "time": 1427915532,
            "notification": null,
            "aggregate_result": {
                "denominator_cpsid": 15,
                "denominator_cpsid2": 22,
                "denominator_cpsid3": 32,
                "denominator_cpsid4": 41,
                "numerator_cpsid": 13,
                "numerator_cpsid2": 18,
                "numerator_cpsid3": 26,
                "numerator_cpsid4": 33
            }
        }
    ]
};

//EXPECTED RESULT FOR THE GIVEN DATA.
var y = {
    processed_result: {
        clinician: [{
            aggregate_result: {numerator: 8, denominator: 10},
            time: 1420143132,
            display_name: 'clinician'
        },
            {
                aggregate_result: {numerator: 8, denominator: 10},
                time: 1421352732,
                display_name: 'clinician'
            },
            {
                aggregate_result: {numerator: 9, denominator: 11},
                time: 1422821532,
                display_name: 'clinician'
            },
            {
                aggregate_result: {numerator: 13, denominator: 15},
                time: 1424031132,
                display_name: 'clinician'
            },
            {
                aggregate_result: {numerator: 13, denominator: 15},
                time: 1425240732,
                display_name: 'clinician'
            },
            {
                aggregate_result: {numerator: 13, denominator: 15},
                time: 1426446732,
                display_name: 'clinician'
            },
            {
                aggregate_result: {numerator: 13, denominator: 15},
                time: 1427915532,
                display_name: 'clinician'
            }],
        group: [{
            aggregate_result: {numerator: 48, denominator: 60},
            time: 1420143132,
            display_name: 'group (test1)'
        },
            {
                aggregate_result: {numerator: 48, denominator: 60},
                time: 1421352732,
                display_name: 'group (test1)'
            },
            {
                aggregate_result: {numerator: 51, denominator: 63},
                time: 1422821532,
                display_name: 'group (test1)'
            },
            {
                aggregate_result: {numerator: 57, denominator: 69},
                time: 1424031132,
                display_name: 'group (test1)'
            },
            {
                aggregate_result: {numerator: 57, denominator: 69},
                time: 1425240732,
                display_name: 'group (test1)'
            },
            {
                aggregate_result: {numerator: 57, denominator: 69},
                time: 1426446732,
                display_name: 'group (test1)'
            },
            {
                aggregate_result: {numerator: 57, denominator: 69},
                time: 1427915532,
                display_name: 'group (test1)'
            }],
        network: [{
            aggregate_result: {numerator: 80, denominator: 100},
            time: 1420143132,
            display_name: 'network'
        },
            {
                aggregate_result: {numerator: 80, denominator: 100},
                time: 1421352732,
                display_name: 'network'
            },
            {
                aggregate_result: {numerator: 83, denominator: 103},
                time: 1422821532,
                display_name: 'network'
            },
            {
                aggregate_result: {numerator: 90, denominator: 110},
                time: 1424031132,
                display_name: 'network'
            },
            {
                aggregate_result: {numerator: 90, denominator: 110},
                time: 1425240732,
                display_name: 'network'
            },
            {
                aggregate_result: {numerator: 90, denominator: 110},
                time: 1426446732,
                display_name: 'network'
            },
            {
                aggregate_result: {numerator: 90, denominator: 110},
                time: 1427915532,
                display_name: 'network'
            }],
        anonymous: {
            PROVIDER_b5d8317dd6d7b4d700e62e444021e85b0c7b2642eaef93d1291e3163: [{
                aggregate_result: {numerator: 16, denominator: 20},
                time: 1420143132
            },
                {
                    aggregate_result: {numerator: 16, denominator: 20},
                    time: 1421352732
                },
                {
                    aggregate_result: {numerator: 17, denominator: 21},
                    time: 1422821532
                },
                {
                    aggregate_result: {numerator: 18, denominator: 22},
                    time: 1424031132
                },
                {
                    aggregate_result: {numerator: 18, denominator: 22},
                    time: 1425240732
                },
                {
                    aggregate_result: {numerator: 18, denominator: 22},
                    time: 1426446732
                },
                {
                    aggregate_result: {numerator: 18, denominator: 22},
                    time: 1427915532
                }],
            PROVIDER_a1b10d8e494dbe5f1be18f4f0664908c2d4213a87de48fa26750c5a5: [{
                aggregate_result: {numerator: 24, denominator: 30},
                time: 1420143132
            },
                {
                    aggregate_result: {numerator: 24, denominator: 30},
                    time: 1421352732
                },
                {
                    aggregate_result: {numerator: 25, denominator: 31},
                    time: 1422821532
                },
                {
                    aggregate_result: {numerator: 26, denominator: 32},
                    time: 1424031132
                },
                {
                    aggregate_result: {numerator: 26, denominator: 32},
                    time: 1425240732
                },
                {
                    aggregate_result: {numerator: 26, denominator: 32},
                    time: 1426446732
                },
                {
                    aggregate_result: {numerator: 26, denominator: 32},
                    time: 1427915532
                }]
        }
    },
    provider_id: 'cpsid'
};

module.exports = {data: x, expected: y};
