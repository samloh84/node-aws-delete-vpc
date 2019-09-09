const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('../aws').ec2;
const util = require('../util');
// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInternetGateways-property
let describe_internet_gateways = util.wrap(function (params) {
    return Promise.resolve(ec2.describeInternetGateways(params).promise())
        .then(function (results) {
            return _.get(results, 'InternetGateways');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteInternetGateway-property
let delete_internet_gateway = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {InternetGatewayId: params};
    }
    return Promise.resolve(ec2.deleteInternetGateway(params).promise());
}, {message: 'Deleting Internet Gateway'});


let describe_internet_gateways_by_internet_gateway_ids = function (internet_gateway_ids) {
    if (!_.isArray(internet_gateway_ids)) {
        internet_gateway_ids = [internet_gateway_ids];
    }
    return describe_internet_gateways({InternetGatewayIds: internet_gateway_ids});
};

let describe_internet_gateways_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return describe_internet_gateways({
        Filter: [{
            Name: 'attachment.vpc-id',
            Values: vpc_ids
        }]
    });
};


let delete_internet_gateways_by_internet_gateway_ids = function (internet_gateway_ids) {
    if (!_.isArray(internet_gateway_ids)) {
        internet_gateway_ids = [internet_gateway_ids];
    }

    return detach_internet_gateways_by_internet_gateway_ids(internet_gateway_ids)
        .then(function () {
            return util.retry({
                op: delete_internet_gateway,
                args: internet_gateway_ids,
                list: describe_internet_gateways_by_internet_gateway_ids,
                validate: _.isEmpty,
                message: 'Deleting Internet Gateway'
            });
        });
};


let list_internet_gateway_attachments = function (internet_gateway) {
    if (_.isArray(internet_gateway)) {
        return _.flatten(_.map(internet_gateway, list_internet_gateway_attachments));
    }

    let attachments = [];
    _.each(internet_gateway.Attachments, function (attachment) {
        if (attachment.State !== 'detached') {
            attachments.push({
                InternetGatewayId: internet_gateway.InternetGatewayId,
                VpcId: attachment.VpcId
            });
        }
    });

    return attachments;
};

let list_internet_gateway_attachments_by_internet_gateway_ids = function (internet_gateway_ids) {
    return describe_internet_gateways_by_internet_gateway_ids(internet_gateway_ids)
        .then(list_internet_gateway_attachments);
};

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#detachInternetGateway-property
let detach_internet_gateway = util.wrap(function (params) {
    return Promise.resolve(ec2.detachInternetGateway(params).promise());
}, {message: 'Detaching Internet Gateway'});

let detach_internet_gateways_by_internet_gateway_ids = function (internet_gateway_ids) {
    if (!_.isArray(internet_gateway_ids)) {
        internet_gateway_ids = [internet_gateway_ids];
    }

    return util.retry({
        args: internet_gateway_ids,
        op: detach_internet_gateway,
        op_args: list_internet_gateway_attachments_by_internet_gateway_ids,
        list: list_internet_gateway_attachments_by_internet_gateway_ids,
        validate: _.isEmpty,
        message: 'Detaching Internet Gateway'
    });


};

module.exports = {
    delete_internet_gateway: delete_internet_gateway,
    delete_internet_gateways_by_internet_gateway_ids: delete_internet_gateways_by_internet_gateway_ids,
    describe_internet_gateways: describe_internet_gateways,
    describe_internet_gateways_by_internet_gateway_ids: describe_internet_gateways_by_internet_gateway_ids,
    describe_internet_gateways_by_vpc_ids: describe_internet_gateways_by_vpc_ids,
    detach_internet_gateway: detach_internet_gateway,
    detach_internet_gateways_by_internet_gateway_ids: detach_internet_gateways_by_internet_gateway_ids,
    list_internet_gateway_attachments: list_internet_gateway_attachments
};
