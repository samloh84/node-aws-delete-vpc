const Promise = require('bluebird');
const _ = require('lodash');
const route53 = require('../aws').route53;
const util = require('../util');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#listHostedZonez-property
let list_hosted_zones = util.wrap(function (params) {
    return Promise.resolve(route53.listHostedZones(params).promise())
        .then(function (results) {
            return _.get(results, 'HostedZones');
        });
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#getHostedZone-property
let get_hosted_zone = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {Id: params};
    }
    return Promise.resolve(route53.getHostedZone(params).promise());
});

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#deleteHostedZone-property
let delete_hosted_zone = util.wrap(function (params) {
    if (_.isString(params)) {
        params = {Id: params};
    }
    return Promise.resolve(route53.deleteHostedZone(params).promise());
}, {message: 'Deleting HostedZone'});


let describe_hosted_zones_by_hosted_zone_ids = function (hosted_zone_ids) {
    if (!_.isArray(hosted_zone_ids)) {
        hosted_zone_ids = [hosted_zone_ids];
    }
    return get_hosted_zone(hosted_zone_ids);
};

let describe_hosted_zones_by_vpc_ids = function (vpc_ids) {
    if (!_.isArray(vpc_ids)) {
        vpc_ids = [vpc_ids];
    }
    return list_hosted_zones()
        .then(function (hosted_zones) {
            let hosted_zone_ids = _.map(hosted_zones, 'Id');
            return get_hosted_zone(hosted_zone_ids);
        })
        .then(function (hosted_zones) {
            return _.filter(hosted_zones, function (hosted_zone) {
                return _.some(_.get(hosted_zone, 'VPCs'), function (vpc) {
                    return _.includes(vpc_ids, _.get(vpc, 'VPCId'));
                })
            });
        });
};


let delete_hosted_zones_by_hosted_zone_ids = function (hosted_zone_ids) {
    if (!_.isArray(hosted_zone_ids)) {
        hosted_zone_ids = [hosted_zone_ids];
    }
    return util.retry({
        args: hosted_zone_ids,
        op: delete_hosted_zone,
        list: describe_hosted_zones_by_hosted_zone_ids,
        validate: _.isEmpty,
        message: 'Deleting HostedZones'
    });
};


module.exports = {
    describe_hosted_zones: get_hosted_zone,
    delete_hosted_zone: delete_hosted_zone,
    describe_hosted_zones_by_hosted_zone_ids: describe_hosted_zones_by_hosted_zone_ids,
    describe_hosted_zones_by_vpc_ids: describe_hosted_zones_by_vpc_ids,
    delete_hosted_zones_by_hosted_zone_ids: delete_hosted_zones_by_hosted_zone_ids,
};
