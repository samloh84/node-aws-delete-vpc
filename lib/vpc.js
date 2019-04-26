const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeVpcs-property
function list_vpcs(params) {
    return ec2.describeVpcs(params).promise()
        .then(function (response) {
            return response.Vpcs;
        });
}


function list_vpcs_by_ids(vpc_ids) {
    return list_vpcs({
        VpcIds: vpc_ids
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#deleteVpc-property
// Note: You must terminate all running instances in the vpc before you can delete the vpc.
function delete_vpcs(vpc_ids) {
    if (_.isEmpty(vpc_ids)) {
        return Promise.resolve();
    }

    return Promise.map(vpc_ids, function (vpc_id) {
        console.log(`Deleting VPC: ${vpc_id}`);
        return ec2.deleteVpc({VpcId: vpc_id}).promise()
    }, {concurrency: 1})
        .then(function () {
            return list_vpcs_by_ids(vpc_ids)
        })
        .then(function (vpcs) {
            if (!_.every(vpcs, {State: 'deleted'})) {
                return Promise.delay(15000)
                    .then(function () {
                        return delete_vpcs(vpc_ids);
                    })
            } else {
                console.log(`Deleted VPCs: ${vpc_ids.join(', ')}`);
            }
        });

}


module.exports = {
    list_vpcs: list_vpcs,
    list_vpcs_by_ids: list_vpcs_by_ids,
    delete_vpcs: delete_vpcs
};