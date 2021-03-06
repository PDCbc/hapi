var logger = require("./logger").Logger('groups', 1);
var fs = require('fs');
var util = require('util');
var groups = [];

function setupGroups(next)
{

	try {
	  logger.info("Reading groups from: " + process.env.HAPI_GROUPS);
	  groups = JSON.parse(fs.readFileSync(process.env.HAPI_GROUPS, 'utf8'));
	} catch (e) {
	  logger.error("Failed to read groups from: " + process.env.HAPI_GROUPS + " falling back on default test groups.");
	  logger.error(e);
	  console.log(e.stack);
	  throw(e);
	}	

	next(null);
}

/**
 * Determines if the idA is in the same group as idB.
 *
 * @param idA {String} - A string id
 * @param idB {String} - Check if this id is in the same group as idA.
 * @return {Boolean} - true if both ideas are in the same group, false otherwise.
 */
var inSameGroup = function (idA, idB) {

    try {

        return inGroup(idB, findGroup(idA));

    } catch (e) {

        return false;

    }
};

/**
 * Determines if the id is in the group identified by groupName
 *
 * @param id {String}
 * @param groupName {String}
 *
 * @return {Boolean} - true if id is in group, false otherwise.
 */
var inGroup = function (id, groupName) {

    //Can't operate without these variables.
    if (!id || !groupName) {

        return false;

    }

    for (var i = 0; i < groups.length; i++) {

        if (groups[i].name === groupName) {

            if (groups[i].members.indexOf(id) > -1) {

                return true;

            }

        }

    }

    return false;
};

/**
 * Determines if the id is in a group.
 *
 * @param id {String} - the id to search for.
 * @param init {String} - the initiative to look for.
 *
 * @return {String} - the name of the group that the id is in,
 *       if no group was found, then returns null.
 *
 * @throws {Error} - if the id is found in more than one group within the same initative.
 */
var findGroup = function (id, init) {

    //can't find a group without an ID.
    if (!id) {

        return null;

    }

    var returnValue = null;

    //loop through all of the groups
    for (var i = 0; i < groups.length; i++) {

	//loop through all of the members
        for (var k = 0; k < groups[i].members.length; k++) {
	

            //check to see if the group is part of the specified initiative.

            if(init != groups[i].initiative){
                continue;
            }


            //check if the member matches the id we are looking for.
            if (id === groups[i].members[k]) {

                if (returnValue === null) {

                    returnValue = groups[i].name;

                } else {

                    throw new Error("id " + id + " was found in atleast 2 groups: " + returnValue + " and " + groups[i].name);

                }

            }

        }

    }

    return returnValue;
};

/**
 * Returns the members of a the group identified by groupName.
 *
 * @param groupName {String}
 *
 * @return - an Array of strings that are the members of the groups.
 */
var getMembers = function (groupName) {

    if (!groupName) {

        return [];

    }

    for (var i = 0; i < groups.length; i++) {

        if (groups[i].name === groupName) {

            return groups[i].members;

        }

    }

    return [];

};

var setData = function (data) {

    if (!data) {

        return;

    }

    //copy the object in its entirety.
    groups = JSON.parse(JSON.stringify(data));


};

var getGroups = function () {

    return groups;

};

var getData = function () {

    return groups;
};

module.exports = {
    groups    : groups,
    findGroup : findGroup,
    inGroup   : inGroup,
    inSameGroup: inSameGroup,
    setData   : setData,
    getGroups : getGroups,
    getMembers: getMembers,
    getData   : getData,
    setupGroups: ['environment', setupGroups]
};
