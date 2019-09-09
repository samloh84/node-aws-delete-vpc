const Promise = require('bluebird');
const _ = require('lodash');
const rds = require('../aws').rds;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeDbInstances-property
let describe_db_instances = util.wrap(function (params) {
    return Promise.resolve(rds.describeDBInstances(params).promise())
        .then(function (results) {
            return _.get(results, 'DBInstances');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteDbInstance-property
let delete_db_instance = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {DbInstanceId: params};
    }
    return Promise.resolve(rds.deleteDBInstance(params).promise());
}, {message: 'Deleting DBInstance'});


let describe_db_instances_by_db_instance_ids = function (db_instance_ids) {
    if (!_.isArray(db_instance_ids)) {
        db_instance_ids = [db_instance_ids];
    }
    return describe_db_instances({
        Filter: [{
            Name: 'db-instance-id',
            Values: db_instance_ids
        }]
    });
};

let describe_db_instances_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_db_instances()
        .then(function (db_instances) {
            return _.filter(db_instances, function (db_instance) {
                return _.includes(vpc_ids, _.get(db_instance, 'DBSubnetGroup.VpcId'));
            });
        });
};


let delete_db_instances_by_db_instance_ids = function (db_instance_ids) {
    if (!_.isArray(db_instance_ids)) {
        db_instance_ids = [db_instance_ids];
    }
    return util.retry({
        args: db_instance_ids,
        op: delete_db_instance,
        list: describe_db_instances_by_db_instance_ids,
        validate: _.isEmpty,
        message: 'Deleting DbInstances'
    });
};


module.exports = {
    describe_db_instances: describe_db_instances,
    delete_db_instance: delete_db_instance,
    describe_db_instances_by_db_instance_ids: describe_db_instances_by_db_instance_ids,
    describe_db_instances_by_vpc_ids: describe_db_instances_by_vpc_ids,
    delete_db_instances_by_db_instance_ids: delete_db_instances_by_db_instance_ids,
};
