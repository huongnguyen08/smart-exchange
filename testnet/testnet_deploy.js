var fs = require('fs');
var sleep = require('sleep');
var web3 = require('web3');
var log = require('../lib/log');

var deploy = function (config, address, callback) {
    var deployed = false;
    var owner = address;

    web3.setProvider(new web3.providers.HttpProvider('http://localhost:' + config.jsonrpc_port));

    var interval = setInterval(function () {
        // wrap it into try catch cause we dont know when rpc server starts
        try { 
            // these value must match value from scripts/mine.js
            if ((web3.eth.getBalance(address) >= 30000000000000000000) && !deployed) {
                deployed = true; // or at least tried to
                clearInterval(interval);
                var file = fs.readFileSync(__dirname + '/contracts/ICAPRegistrar.sol'); 
                var compiled = web3.eth.compile.solidity(file.toString());

                // TODO: make it configurable
                var code = compiled.ICAPRegistrar.code; 
                var abi = compiled.ICAPRegistrar.info.abiDefinition;


                // create new contract and get it's transaction hash
                // ICAPRegistrar costs 422659
                var transactionHash = web3.eth.contract(abi).new({data: code, from: owner, gas: 423000}).transactionHash;

                // wait for contract to be mined for 120 seconds
                // TODO: validate receipt code
                var receipt = null;
                var counter = 0;
                
                while ((receipt = web3.eth.getTransactionReceipt(transactionHash)) === null) {
                    if (counter++ > 120) {
                        break;
                    }
                    sleep.sleep(1);
                }

                if (receipt) {
                    // after receiving transaction receipt we can assume, that contract is properly created
                    // let's reserve identifier in namereg && save pair (identifier, address)
                    callback(null, receipt.contractAddress); 
                } else {
                    callback('error!');
                }
            }
        } catch (err) {
            log.warn('Deploying contract failed. Trying again...');
        }
    }, 1000);
};

module.exports = deploy;
