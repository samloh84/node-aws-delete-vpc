const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeSubnets-property
function list_subnets(params) {
    return ec2.describeSubnets(params).promise()
        .then(function (response) {
            return response.Subnets;
        });
}

function list_subnets_by_vpc_ids(vpc_ids) {
    return list_subnets({
        Filters: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_subnets_by_ids(subnet_ids) {
    return list_subnets({
        Filters: [
            {
                Name: "subnet-id",
                Values: subnet_ids
            }
        ]
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteSubnet-property
// Note: You must terminate all running instances in the subnet before you can delete the subnet.
function delete_subnets(subnet_ids) {
    if (_.isEmpty(subnet_ids)) {
        return Promise.resolve();
    }


    return Promise.map(subnet_ids, function (subnet_id) {
        console.log(`Deleting Subnet: ${subnet_id}`);
        return ec2.deleteSubnet({SubnetId: subnet_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_subnets_by_ids(subnet_ids)
        })
        .then(function (subnets) {
            if (!_.every(subnets, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_subnets(subnet_ids);
                    })
            } else {
                console.log(`Deleted Subnets: ${subnet_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_subnets: list_subnets,
    list_subnets_by_vpc_ids: list_subnets_by_vpc_ids,
    list_subnets_by_ids: list_subnets_by_ids,
    delete_subnets: delete_subnets
};