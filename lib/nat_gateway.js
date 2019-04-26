const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2.js');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeNatGateways-property
function list_nat_gateways(params) {
    return ec2.describeNatGateways(params).promise()
        .then(function (response) {
            return response.NatGateways;
        });
}

function list_nat_gateways_by_vpc_ids(vpc_ids) {
    return list_nat_gateways({
        Filter: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_nat_gateways_by_ids(nat_gateway_ids) {
    return list_nat_gateways({
        Filter: [
            {
                Name: "nat-gateway-id",
                Values: nat_gateway_ids
            }
        ]
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteNatGateway-property
function delete_nat_gateways(nat_gateway_ids) {
    if (_.isEmpty(nat_gateway_ids)) {
        return Promise.resolve();
    }
    return Promise.map(nat_gateway_ids, function (nat_gateway_id) {
        console.log(`Deleting NAT Gateway: ${nat_gateway_id}`);
        return ec2.deleteNatGateway({NatGatewayId: nat_gateway_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_nat_gateways_by_ids(nat_gateway_ids)
        })
        .then(function (nat_gateways) {
            if (!_.every(nat_gateways, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_nat_gateways(nat_gateway_ids);
                    })
            } else {
                console.log(`Deleting NAT Gateways: ${nat_gateway_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_nat_gateways: list_nat_gateways,
    list_nat_gateways_by_vpc_ids: list_nat_gateways_by_vpc_ids,
    list_nat_gateways_by_ids: list_nat_gateways_by_ids,
    delete_nat_gateways: delete_nat_gateways
};