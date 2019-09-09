const AWS = require('aws-sdk');


AWS.config.region = 'ap-southeast-1';
AWS.config.setPromisesDependency(Promise);

AWS.config.apiVersions = {
    ec2: '2016-11-15',
    autoscaling: '2011-01-01',
    rds: '2014-10-31',
    route53: '2013-04-01',
    eks: '2017-11-01',
};

let exports = {
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html
    ec2: new AWS.EC2(),

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EKS.html
    eks: new AWS.EKS(),

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ELBv2.html
    elbv2: new AWS.ELBv2(),

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html
    route53: new AWS.Route53(),

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/RDS.html
    rds: new AWS.RDS(),

    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/AutoScaling.html
    autoscaling: new AWS.AutoScaling()
};


module.exports = exports;

