# AWS Delete VPC

AWS Delete VPC is a Node utility script to list all resources in an AWS VPC, delete them, then delete the VPC. 

## Installation

1. Clone this repository using Git.

2. Use NPM to install the dependencies required for this script. 

    ```bash
    npm install
    ```

## Usage

1. Run the following command to list resources in the specified VPC IDs
```bash
node index.js list vpc_id1 vpc_id2 vpc_id3
```
2. Run the following command to delete resources in the specified VPC IDs
```bash
node index.js delete vpc_id1 vpc_id2 vpc_id3
```

## License
[MIT](https://choosealicense.com/licenses/mit/)

