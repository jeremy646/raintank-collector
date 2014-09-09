'use strict';
var dns = require('native-dns');
var util = require('util');

/*
var params = ['server', 'protocol', 'port', 'type','timeout','name', 'regexp'];
*/
exports.run = function(req, res) {
    console.log(req.body);
    var question = dns.Question({
        name: req.body.name,
        type: req.body.type,
    });
    var server = {
        address: req.body.server,
        port: parseInt(req.body.port),
        type: req.body.protocol,
    };

    var profile = {
        time: null,
        ttl: null,
        answers: null,
    };

    var startTime = new Date();
    var step = startTime;
    var dnsReq = dns.Request({question: question, server: server, timeout: (req.body.timeout * 1000), cache: false});
    
    dnsReq.on('timeout', function(){
        profile.error = "timed out after " + req.body.timeout + " seconds.";
        respond(res, profile);
    });

    dnsReq.on('message', function(err, answer) {
        if (err) {
            console.log(err);
            profile.error = "dns lookup failure.";
            return respond(res, profile);
        }
        var dnsTime = new Date();
        profile.time = dnsTime.getTime() - step.getTime();
        if (answer.answer.length > 0) {
            profile.ttl = answer.answer[0].ttl;
        }
        profile.answers = answer.answer.length;
        var regexMatch = false;
        var regex = new RegExp(req.body.regexp);
        answer.answer.forEach(function(resp) {
            var respText = toString(req.body.type, resp);
            if (regex.test(respText)) {
                regexMatch = true;
            } 
        });
        if (!(regexMatch)) {
            profile.error = 'Regular Expression not matched for any answer.';
        };
        respond(res, profile);
    });
    dnsReq.send()

}

function respond(res, profile) {
    var metrics = ['time'];
    metrics.forEach(function(m) {
        if (!isNaN(profile[m]) && profile[m] > 0 ) {
            profile[m] = profile[m]/1000;
        }
    });
    res.json({success: true, results: profile});
}

function toString(type, answer) {

    var response = '';
    switch (type) {
        case 'SOA':
            response = util.format('%s %s %s %s %s %s %s',
                answer.primary,
                answer.admin,
                answer.serial,
                answer.refresh,
                answer.retry,
                answer.expiration,
                answer.minimum );
            break;
        case 'A':
        case 'AAAA':
            response = answer.address;
            break;
        case 'TXT':
        case 'CNAME':
        case 'PTR':
        case 'NS':
            response = answer.data;
            break;
        case 'SRV':
            response = util.format('%s %s %s %s', 
                answer.priority,
                answer.weight,
                answer.port,
                answer.target);
            break;
        case 'MX':
            response = util.format('%s %s', 
                answer.priority,
                answer.exchange);
            break;
    };
    return response;
};