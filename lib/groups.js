
var logger = require("./logger").Logger('groups', 1);

var groups = [
    {
      name:'PPhRR1',
      members:['cpsid2', 'cpsid3', 'cpsid', '27542', 'oscar', 'osler' ]
    },{
      name:'PPhRR2',
      members:['cpsid4']
    }
];

/**
* Determines if the idA is in the same group as idB. 
*
* @param idA {String} - A string id
* @param idB {String} - Check if this id is in the same group as idA. 
* @return {Boolean} - true if both ideas are in the same group, false otherwise.
*/
var inSameGroup = function( idA, idB ){

    return inGroup(idB, findGroup(idA)); 
}

/**
* Determines if the id is in the group identified by groupName
*
* @param id {String}
* @param groupName {String}
*
* @return {Boolean} - true if id is in group, false otherwise.
*/
var inGroup = function ( id, groupName ){

    //Can't operate without these variables.
    if ( !id || !groupName ){

        return false; 

    }

    for( var i = 0; i < groups.length; i++ ){

        if ( groups[i].name === groupName ){

            if ( groups[i].indexOf(id) > -1 ){

                return true;

            }

        }

    } 

    return false; 
}

/**
* Determines if the id is in a group.
* 
* @param id {String} - the id to search for.
*
* @return {String} - the name of the group that the id is in, 
*       if no group was found, then returns null. 
*/
var findGroup = function(id){

    //can't find a group without an ID.
    if ( !id ){

        return null; 

    }

    //loop through all of the groups
    for( var i = 0; i < groups.length; i++ ){

        //loop through all of the members
        for( var k = 0; k < group[i].members.length; k ++ ){

            //check if the member matches the id we are looking for.
            if ( id === group[i].members[k] ){

                return group[i].name; 

            }

        }

    }

    return null; 
}

/**
* Returns the members of a the group identified by groupName. 
*
* @param groupName {String} 
* 
* @return - an 
*/
var getMembers = function(groupName){

    if ( !groupName ){

        return []; 

    }

    for( var i = 0; i < groups.length; i++ ){

        if (groups[i].name === groupName){

            return groups[i].members;

        } 

    }

    return []; 

}

module.exports = {
    groups: groups,
    findGroup : findGroup,
    inGroup : inGroup,
    inSameGroup : inSameGroup
};