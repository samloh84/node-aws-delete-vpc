const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNatGateways-property
let describe_nat_gateways = util.wrap(function (params) {
    return Promise.resolve(ec2.describeNatGateways(params).promise())
        .then(function (results) {
            return _.get(results, 'NatGateways');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteNatGateway-property
let delete_nat_gateway = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {NatGatewayId: params};
    }
    return Promise.resolve(ec2.deleteNatGateway(params).promise());
}, {message: 'Deleting Nat Gateway'});


let describe_nat_gateways_by_nat_gateway_ids = function (nat_gateway_ids) {
    if (!_.isArray(nat_gateway_ids)) {
        nat_gateway_ids = [nat_gateway_ids];
    }
    return describe_nat_gateways({NatGatewayIds: nat_gateway_ids});
};

let describe_nat_gateways_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_nat_gateways({Filter: [{Name: 'vpc-id', Values: vpc_ids}]});
};


let delete_nat_gateways_by_nat_gateway_ids = function (nat_gateway_ids) {
    if (!_.isArray(nat_gateway_ids)) {
        nat_gateway_ids = [nat_gateway_ids];
    }

    return util.retry({
        args: nat_gateway_ids,
        op: delete_nat_gateways_by_nat_gateway_ids,
        list: describe_nat_gateways_by_nat_gateway_ids,
        validate: function (nat_gateways) {
            return _.every(nat_gateways, {State: 'deleted'});
        },
        message: 'Deleting Nat Gateways'
    });
};


module.exports = {
    describe_nat_gateways: describe_nat_gateways,
    delete_nat_gateway: delete_nat_gateway,
    describe_nat_gateways_by_nat_gateway_ids: describe_nat_gateways_by_nat_gateway_ids,
    describe_nat_gateways_by_vpc_ids: describe_nat_gateways_by_vpc_ids,
    delete_nat_gateways_by_nat_gateway_ids: delete_nat_gateways_by_nat_gateway_ids,
};
