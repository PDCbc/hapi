
# API

The hubapi component acts as a data access and processing layer around the mongodb. It has the following routes of interest: 


- `GET /retro/:title`
    + This route will return a JSON object that contains data for the query identified by `:title`.
    + This route is used for *ratio* type queries.
    + It will return data that is almost identical to the `/api/processed_result` route, the only difference being that it look for many executions over time instead of just the most recent.
    + This route requires that cookie be passed via the query string of the URL
        *  it must be accessible via: `request.query.cookie`
    + During normal execution, the route will return a JSON string/object of the following structure: 

    ```JavaScript
    { 
        "processed_result" : { 
            "clinician" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ], 
            "group" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ],
            "network" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ],
        }, 
        "provider_id" : STRING, 
        "network_id" : STRING,
        "title" : STRING, 
        "description" : STRING 
    }
    ```
    + The status codes are as follows, in the event of an error code (status > 399) or no content (status == 204) the data object will be `null` or an empty object `{}` : 
        * `200` - Processing completed successfully, the resulting data will be in the returned object. 
        * `204` - The request was correctly processed, but no executions for this query exist!
        * `400` - Request for data was not well formed, i.e. there was not `request.body.bakedCookie` field
        * `404` - The query requested does not exist
        * `401` - Request failed due to invalid credential
        * `500` - Request failed due to unknown server error. 

- `GET /api/processed_result/:title`
    + Returns data for the query identified by the `:title` input
    + This route is used for *ratio* type queries.
    + This route requires that cookie be passed via the query string of the URL
        *  it must be accessible via: `request.query.cookie`
    + During normal execution, the route will return a JSON string/object of the following structure: 

    ```JavaScript
    { 
        "processed_result" : { 
            "clinician" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ], 
            "group" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ],
            "network" : [
                { "aggregate_result" : { "numerator" : INT , "denominator" : INT }, "time": TIMESTAMP, "display_name" : STRING },
                ... 
            ],
        }, 
        "provider_id" : STRING, 
        "network_id" : STRING,
        "title" : STRING, 
        "description" : STRING 
    }
    ```
    + The status codes are as follows, in the event of an error code (status > 399) or no content (status == 204) the data object will be `null` or an empty object `{}` : 
        * `200` - Processing completed successfully, the resulting data will be in the returned object. 
        * `204` - The request was correctly processed, but no executions for this query exist!
        * `400` - Request for data was not well formed, i.e. there was not `request.body.bakedCookie` field
        * `404` - The query requested does not exist
        * `401` - Request failed due to invalid credential
        * `500` - Request failed due to unknown server error. 

- `GET /demographics`
    + Returns data for the demographics query. 
    + This route requires that cookie be passed via the query string of the URL
        *  it must be accessible via: `request.query.cookie`
    + During normal execution, the route will return a JSON string/object of the following structure: 
    + Returns data for **single** (most recent) execution. For all executions see `/retro/demographics` route. 

    ```JavaScript
    { 
        "clinician" : [ { "gender" : { "age-range" : NUMBER, ... }, ... } ],
        "group" : [ { "gender" : { "age-range" : NUMBER, ... }, ... } ],
        "network" : [ { "gender" : { "age-range" : NUMBER, ... }, ... } ],
        "provider_id" : STRING
    }
    ```
    + The status codes are as follows, in the event of an error code (status > 399) or no content (status == 204) the data object will be `null` or an empty object `{}` : 
        * `200` - Processing completed successfully, the resulting data will be in the returned object. 
        * `204` - The request was correctly processed, but no executions for this query exist!
        * `400` - Request for data was not well formed, i.e. there was not `request.body.bakedCookie` field
        * `404` - The query requested does not exist
        * `401` - Request failed due to invalid credential
        * `500` - Request failed due to unknown server error. 

- `GET /api/queries`
    + Returns a list of all of the queries and their executions 
    + This route requires that cookie be provided that is accessible via the Node Express: `request.query.cookie` object.
    + During normal operation, the route will return a JSON string of the following format: 

    ```JavaScript
    {
        "queries" : [
            { "_id" : STRING, "title" : STRING, "user_id" : STRING, "description" : STRING, "executions" : [ ... ] },
            ... 
        ]
    }
    ```
    + This route should be used to determine which queries exist within the hub.
    + The status codes are as follows, in the event of an error code (status > 399) or no content (status == 204) the data object will be null or an empty object {} : 
        * `200` - Completed successfully, the resulting data will be in the returned object. 
        * `204` - The request was executed correctly, but no queries were found.
        * `400` - Request for data was not well formed, i.e. there was not `request.body.bakedCookie` field
        * `404` - The query requested does not exist
        * `401` - Request failed due to invalid credential
        * `500` - Request failed due to unknown server error. 

- `GET /reports/`
    + This route will return a list of reports that can requested. It is analogous to the `/api/queries` route but for reports instead of queries.  
    + This report requires that a cookie be passed via the request GET query string, it must be accessible via Express' `request.query.cookie` object. The cookie must contain user information and will be used to authenticate the user.
    + During normal (non-error) operation, the following object structure will be returned: 

    ```JavaScript
    [
        { "shortTitle" : STRING, "title" : STRING},
        ...
    ]
    ```
        * Where the `shortTitle` field is a name used to reference the report by HAPI. All subsequent requests to `/reports/title` should use the `shortTitle`. The `title` field of the returned object is a human readable string that can be presented in the user interface.  
    + The status codes are as follows, in the event of an error code (status > 399) or no content (status == 204) the data object will be an empty array `[]`. 
        * `200` - Completed successfully, data will be as described above.
        * `204` - Completed successfully, but no reports were found, data will be an empty array.
        * `400` - Request for data was not well formed, i.e. there was not `request.body.bakedCookie` field
        * `401` - Request failed due to invalid credentials
        * `500` - Failed due to a server failure. 

- `GET /reports/:title`
    + This route requires that the cookie be sent in the request query string. 
    + This route will return a CSV data in a buffer that can be consumed by a client. 
    + During normal operation (non-error), a `STRING` will be returned that is the report CSV string. 
    + Under normal operation (non-error), the route will return HTTP status code `200`, in other cases the following will be returned and the `STRING` will be `null`:  
        * `204` - The request was successful, but no content was found.
        * `400` - The request was poorly formatted, perhaps the cookie was not there.
        * `401` - The request failed to authenticate via the auth component, i.e. the cookie was invalid
        * `404` - Report does not exist.
        * `500` - Server error occurred

- `GET /medclass`
    + This route will return a JSON object that shows the 10 most commonly prescribed medication classes for the user of interest.
    + The route requires that user information be in a cookie sent via the GET query string.
    + Under normal operation (non-error, status code 200) the route will return the following JSON string as a response:
    
    ```JavaScript
    {
        provider_id : STRING
        processed_result : {

            display_names : {

                clinician : STRING,
                group : STRING,
                network: STRING

            }, 

            drugs : [
                {
                    drug_name : STRING,
                    agg_data : [
                        { set: "clinician", numerator : NUMBER, denominator: NUMBER, time: TIMESTAMP },
                        { set: "group", numerator : NUMBER, denominator: NUMBER, time: TIMESTAMP },
                        { set: "network", numerator : NUMBER, denominator: NUMBER, time: TIMESTAMP }
                    ]
                }, 
                ...
            ]
        }
    }
    ```

    + If an error occurs the data returned by this route will be `null` and the status code will be one of: 
        * `204` - The request was successful, but no data or executions of this query were found.
        * `400` - The request was poorly formatted, perhaps the cookie was not sent?
        * `401` - The request failed to authenticate via the auth component, i.e. the cookie was invalid
        * `404` - The requested query does not exist.
        * `500` - Server error occurred.


# Tests

## Unit Tests

Unit tests reside in the `test/` directory. They are using the [MochaJs](http://mochajs.org/) unit test framework. Code coverage is provided by [Blanket](https://github.com/alex-seville/blanket) The directory is structured to mirror the `lib/` directory, please keep it organized! To run tests use the following: 

`npm test` - this runs a suite of mocha tests and a code coverage by running `sh runtests.sh`.

Alternatively, code coverage can be run independently of the regular mocha reporter: `npm run test-coverage` and tests can be run without coverage: `npm run test-no-coverage`.  

Note: the coverage and normal coverage unit tests are coupled together in `npm test` because the mocha does not currently support multiple reporter types (html-cov AND command line) at the same time.  

# Setup

## Dependencies

Before starting, you should ensure you have the following available on your machine:

* An active MongoDB instance.
* Node.js

On Mac OS X or a RHEL/Fedora derivative you can install it like so:

```bash
cd $PROJECT_DIRECTORY
./setup.sh
```

If you're on Windows, or feel like having a VM to work on, install [Vagrant](https://www.vagrantup.com/) try using our `Vagrantfile`:

```bash
cd $PROJECT_DIRECTORY
vagrant up  # Start the VM.
vagrant ssh # Shell into the VM.
```

## Starting

```bash
cd $PROJECT_DIRECTORY
npm install # Install Dependencies into `.node_modules/`.
npm start   # Start the application.
```

### Starting for Development

During development it can desirable to set URLs of other components (MongoDB, Visualizer, Auth, DCLAPI etc...)
to something other than default. Do this by setting environment variables for the process, for example: 

```bash
MONGO_URI=mongodb://localhost:27019/query_composer_development AUTH_CONTROL=https://localhost:3006 DCLAPI_URI=http://localhost:3007 npm start
```

Note that the components at the URLs given must be running, if you are having issues consider the following:
    - Are all the right ports open on the various machines?
    - Are you on the right network?
    - Is the host you are trying to connect to reachable?

# Deploy

There is a `Dockerfile` for use in deployment, however your mileage may vary.

# Troubleshooting

## Making certificates

In order to not have to accept a new cert every time, bake your own. [Source](https://library.linode.com/security/ssl-certificates/self-signed).

```bash
mkdir ./cert
openssl req -new -x509 -days 365 -nodes -out ./cert/server.crt -keyout ./cert/server.key
chmod 600 ./cert/*
```
