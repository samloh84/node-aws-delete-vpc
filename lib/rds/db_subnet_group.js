const Promise = require('bluebird');
const _ = require('lodash');
const rds = require('../aws').rds;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeDbSubnetGroups-property
let describe_db_subnet_groups = util.wrap(function (params) {
    return Promise.resolve(rds.describeDBSubnetGroups(params).promise())
        .then(function (results) {
            return _.get(results, 'DBSubnetGroups');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteDbSubnetGroup-property
let delete_db_subnet_group = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {DBSubnetGroupName: params};
    }
    return Promise.resolve(rds.deleteDBSubnetGroup(params).promise());
}, {message: 'Deleting DBSubnetGroup'});


let describe_db_subnet_groups_by_db_subnet_group_names = function (db_subnet_group_names) {
    if (!_.isArray(db_subnet_group_names)) {
        db_subnet_group_names = [db_subnet_group_names];
    }
    return describe_db_subnet_groups({
        Filter: [{
            Name: 'Name',
            Values: db_subnet_group_names
        }]
    });
};

let describe_db_subnet_groups_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_db_subnet_groups()
        .then(function (db_subnet_groups) {
            return _.filter(db_subnet_groups, function (db_subnet_group) {
                return _.includes(vpc_ids, _.get(db_subnet_group, 'DBSubnetGroup.VpcId'));
            });
        });
};


let delete_db_subnet_groups_by_db_subnet_group_names = function (db_subnet_group_names) {
    if (!_.isArray(db_subnet_group_names)) {
        db_subnet_group_names = [db_subnet_group_names];
    }
    return util.retry({
        args: db_subnet_group_names,
        op: delete_db_subnet_group,
        list: describe_db_subnet_groups_by_db_subnet_group_names,
        validate: _.isEmpty,
        message: 'Deleting DbSubnetGroups'
    });
};


module.exports = {
    describe_db_subnet_groups: describe_db_subnet_groups,
    delete_db_subnet_group: delete_db_subnet_group,
    describe_db_subnet_groups_by_db_subnet_group_ids: describe_db_subnet_groups_by_db_subnet_group_names,
    describe_db_subnet_groups_by_vpc_ids: describe_db_subnet_groups_by_vpc_ids,
    delete_db_subnet_groups_by_db_subnet_group_ids: delete_db_subnet_groups_by_db_subnet_group_names,
};
