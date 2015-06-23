var assert = require('assert');
require('blanket');
var groups = require('../lib/groups.js');

describe('groups', function(){

    beforeEach(function(done){

        var data = [

            {
                name:'test1',
                members:['cpsid1','cpsid2', 'cpsid3', 'cpsid']
            },{
                name:'test2',
                members:['cpsid4']
            },{
                name: "test3",
                members : []
            },{
                name : "test4",
                members : ['cpsid10'] //this combined with group test5 create a case where the 
                                      //id cpsid10 is in the same group.
            },{
                name : "test5",
                members : ['cpsid10', 'cpsid11']
            }

        ];

        groups.setData(data); 

        done(); 

    });

    afterEach(function(done){

        groups.setData([]); 
        done(); 
    })

    describe('#inGroup()', function(){

        //this test verifies that we are actually using the test data
        //that we set in the beforeEach function. 
        it('test of changing values', function(done){

            assert.equal(groups.getGroups()[0].name, "test1");
            assert.equal(groups.getGroups()[1].name, "test2");
            assert.equal(groups.getGroups()[2].name, "test3");

            done();

        });

        it("should return true for id in group", function(done){

            var result = groups.inGroup("cpsid", "test1");
            assert.equal(result, true);
            done(); 

        });

        it("should return false for id not in group", function(done){

            var result = groups.inGroup("cpsid", "test2");
            assert.equal(result, false);
            done();

        });

        it("should return false for id undefined", function(done){

            var result = groups.inGroup(undefined, "test1");
            assert.equal(result, false);
            done();

        });

        it("should return false for id null", function(done){

            var result = groups.inGroup(null, "test1");
            assert.equal(result, false);
            done();

        });

        it("should return false for groupName that is null", function(done){

            var result = groups.inGroup('cpsid', null);
            assert.equal(result, false);
            done();

        });

        it("should return false for groupName that is undefined", function(done){

            var result = groups.inGroup('cpsid', undefined);
            assert.equal(result, false);
            done();

        });

        it("should return false for groupName null and id null", function(done){

            var result = groups.inGroup(null, null);
            assert.equal(result, false);
            done();

        });

        it("should return false for group with no ids in it", function(done){

            var result = groups.inGroup('cpsid', 'test3');
            assert.equal(result, false);
            done();

        });
    });

    describe("#inSameGroup()", function(){

        it('test when both ids are in the same group', function(done){

            var result = groups.inSameGroup('cpsid', 'cpsid1');
            assert.equal(true, result);
            done();

        });

        it('test when ids are in different groups', function(done){

            var result = groups.inSameGroup('cpsid', 'cpsid4');
            assert.equal(false, result);
            done();

        });

        it('test when both ids are in no groups', function(done){

            var result = groups.inSameGroup('NotInAGroup', 'NotInAnotherGroup');
            assert.equal(false, result);
            done();

        });

        it('test when first id is null', function(done){

            var result = groups.inSameGroup(null, 'cpsid2');
            assert.equal(false, result);
            done();

        });

        it('test when second id is null', function(done){

            var result = groups.inSameGroup('cpsid', null);
            assert.equal(false, result);
            done();

        });

        it('test when both ids are null', function(done){

            var result = groups.inSameGroup(null, null);
            assert.equal(false, result);
            done();

        });

        it('test when one of the ids is in two groups', function(done){

            var result = groups.inSameGroup('cpsid10', 'cpsid11');
            assert.equal(false, result);
            done();

        });

    });

    describe("#findGroup", function(){

        it('should return "test1" for id "cpsid"', function(done){

            var result = groups.findGroup('cpsid');
            assert.equal(result, "test1");
            done();

        });

        it('should return null for id "notAnId"', function(done){

            var result = groups.findGroup('cpsid');
            assert.equal(result, "test1");
            done();

        });

        it('should throw an Error because id "cpsid10" is in more than one group', function(done){

            assert.throws(function(){

                var r = groups.findGroup('cpsid10');
                
            });
            done();

        });

    });
});