const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeSubnets-property
let describe_subnets = util.wrap(function (params) {
    return Promise.resolve(ec2.describeSubnets(params).promise())
        .then(function (results) {
            return _.get(results, 'Subnets');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSubnet-property
let delete_subnet = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {SubnetId: params};
    }
    return Promise.resolve(ec2.deleteSubnet(params).promise());
}, {message: 'Deleting Subnet'});


let describe_subnets_by_subnet_ids = function (subnet_ids) {
    if (!_.isArray(subnet_ids)) {
        subnet_ids = [subnet_ids];
    }
    return describe_subnets({SubnetIds: subnet_ids});
};

let describe_subnets_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_subnets({Filter: [{Name: 'vpc-id', Values: vpc_ids}]});
};


let delete_subnets_by_subnet_ids = function (subnet_ids) {
    if (!_.isArray(subnet_ids)) {
        subnet_ids = [subnet_ids];
    }
    return util.retry({
        args: subnet_ids,
        op: delete_subnet,
        list: describe_subnets_by_subnet_ids,
        validate: _.isEmpty,
        message: 'Deleting Subnets'
    });
};


module.exports = {
    describe_subnets: describe_subnets,
    delete_subnet: delete_subnet,
    describe_subnets_by_subnet_ids: describe_subnets_by_subnet_ids,
    describe_subnets_by_vpc_ids: describe_subnets_by_vpc_ids,
    delete_subnets_by_subnet_ids: delete_subnets_by_subnet_ids,
};
