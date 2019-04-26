const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2.js');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInternetGateways-property
function list_internet_gateways(params) {
    return ec2.describeInternetGateways(params).promise()
        .then(function (response) {
            return response.InternetGateways;
        });
}

function list_internet_gateways_by_vpc_ids(vpc_ids) {
    return list_internet_gateways({
        Filters: [
            {
                Name: "attachment.vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_internet_gateways_by_ids(internet_gateway_ids) {
    return list_internet_gateways({
        Filters: [
            {
                Name: "internet-gateway-id",
                Values: internet_gateway_ids
            }
        ]
    });
}

function detach_internet_gateways(internet_gateway_ids) {
    function _list_internet_gateway_attachments() {
        return list_internet_gateways_by_ids(internet_gateway_ids)
            .then(function (internet_gateways) {
                let attachments = [];
                _.each(internet_gateways, function (internet_gateway) {
                    _.each(internet_gateway.Attachments, function (attachment) {
                        if (attachment.State !== 'detached') {
                            attachments.push({
                                InternetGatewayId: internet_gateway.InternetGatewayId,
                                VpcId: attachment.VpcId
                            });
                        }
                    })
                });

                return attachments;
            })
    }

    function _detach_internet_gateway_attachments(internet_gateway_attachments) {

        if (!_.isNil(internet_gateway_attachments)) {
            internet_gateway_attachments = Promise.resolve(internet_gateway_attachments);
        } else {
            internet_gateway_attachments = _list_internet_gateway_attachments();
        }

        return internet_gateway_attachments
            .then(function (internet_gateway_attachments) {
                if (!_.isEmpty(internet_gateway_attachments)) {
                    return Promise.map(internet_gateway_attachments, function (attachment) {
                        return ec2.detachInternetGateway(attachment).promise()
                    }, {concurrency: 1})
                }
            })
            .then(function () {
                return _list_internet_gateway_attachments()
            })
            .then(function (attachments) {
                if (!_.isEmpty(attachments)) {
                    return Promise.delay(15000)
                        .then(function () {
                            return _detach_internet_gateway_attachments(attachments);
                        })
                }
            })
    }

    return _detach_internet_gateway_attachments();
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteInternetGateway-property
// Note: You must detach the internet gateway from the VPC before you can delete it.
function delete_internet_gateways(internet_gateway_ids) {
    if (_.isEmpty(internet_gateway_ids)) {
        return Promise.resolve();
    }
    return Promise.map(internet_gateway_ids, function (internet_gateway_id) {
        console.log(`Deleting Internet Gateway: ${internet_gateway_id}`);
        return ec2.deleteInternetGateway({InternetGatewayId: internet_gateway_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_internet_gateways_by_ids(internet_gateway_ids)
        })
        .then(function (internet_gateways) {
            if (!_.every(internet_gateways, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_internet_gateways(internet_gateway_ids);
                    })
            } else {
                console.log(`Deleting Internet Gateways: ${internet_gateway_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_internet_gateways: list_internet_gateways,
    list_internet_gateways_by_vpc_ids: list_internet_gateways_by_vpc_ids,
    list_internet_gateways_by_ids: list_internet_gateways_by_ids,
    delete_internet_gateways: delete_internet_gateways,
    detach_internet_gateways: detach_internet_gateways
};