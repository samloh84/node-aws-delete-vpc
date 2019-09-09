const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeVpcs-property
let describe_vpcs = util.wrap(function (params) {
    return Promise.resolve(ec2.describeVpcs(params).promise())
        .then(function (results) {
            return _.get(results, 'Vpcs');
        });
});

let describe_vpcs_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_vpcs({VpcIds: vpc_ids});
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteVpc-property
let delete_vpc = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {VpcId: params};
    }
    return Promise.resolve(ec2.deleteVpc(params).promise());
}, {message: 'Deleting Vpc'});

let delete_vpcs_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }

    return util.retry({
        args: vpc_ids,
        op: delete_vpc,
        list: describe_vpcs_by_vpc_ids,
        validate: function (vpcs) {
            return _.every(vpcs, {State: 'deleted'});
        },
        message: 'Deleting Vpcs'
    });
};


module.exports = {
    describe_vpcs: describe_vpcs,
    delete_vpc: delete_vpc,
    describe_vpcs_by_vpc_ids: describe_vpcs_by_vpc_ids,
    delete_vpcs_by_vpc_ids: delete_vpcs_by_vpc_ids
};
