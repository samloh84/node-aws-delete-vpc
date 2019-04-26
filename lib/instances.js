const Promise = require('bluebird');
const _ = require('lodash');
const ec2 = require('./ec2');


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property
function list_instances(params) {
    return ec2.describeInstances(params).promise()
        .then(function (response) {
            return _.flatten(_.map(response.Reservations, 'Instances'));
        });
}

function list_instances_by_vpc_ids(vpc_ids) {
    return list_instances({
        Filters: [
            {
                Name: "vpc-id",
                Values: vpc_ids
            }
        ]
    });
}

function list_instances_by_ids(instance_ids) {
    return list_instances({
        Filters: [
            {
                Name: "instance-id",
                Values: instance_ids
            }
        ]
    });
}


// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#terminateInstances-property
// Note: You must terminate all running instances in the instance before you can terminate the instance.
function terminate_instances(instance_ids) {
    if (_.isEmpty(instance_ids)) {
        return Promise.resolve();
    }

    console.log(`Terminating Instances: ${instance_ids}`);
    return ec2.terminateInstances({InstanceIds: instance_ids}).promise()
        .then(function () {
            return list_instances_by_ids(instance_ids)
        })
        .then(function (instances) {
            if (!_.every(instances, function (instance) {
                return _.get(instance, 'State.Name') === 'terminated';
            })) {
                return Promise.delay(15000)
                    .then(function () {
                        return terminate_instances(instance_ids);
                    })
            } else {
                console.log(`Terminated Instances: ${instance_ids.join(', ')}`);
            }
        });
}


module.exports = {
    list_instances: list_instances,
    list_instances_by_vpc_ids: list_instances_by_vpc_ids,
    list_instances_by_ids: list_instances_by_ids,
    terminate_instances: terminate_instances
};