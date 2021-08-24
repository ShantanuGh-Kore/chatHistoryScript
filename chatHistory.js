var request = require('request-promise');
var _ = require('lodash');
var fs = require('fs');
var timezone = require("moment-timezone");
var Promise = require('bluebird').config({ warnings: { wForgottenReturn: false } });
var config = require("./config");
var streamId = config.streamId;
var hostUrl = config.origin;
var jsonexport = require('jsonexport');
var results = [];
var messageDate;
var setLimit = 100;
var d = new Date();
var fileName = "report" + d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes();
fileName += ".csv";
var t0 = new Date().getTime();
var fromDate = config.fromDate;
var toDate = config.toDate;
//mail options
var sendMail = require('./sendMail');
var mailOptions = '';
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
function sorting(array) {
    array.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        } else {
            return 0;
        }
    });
    return array
}
console.log("\n\n" + "Initiating the conversation history download...\n\n");
console.log("The output will be written to " + fileName + "  \n\n");

function getKoraLogs(offset, streamId) {
    console.log("Retrieving records with offset " + offset + "...\n");
    var options1 = {
        method: 'POST',
        url: hostUrl+'/api/public/bot/' + streamId + '/getMessages',
        body: {
            dateFrom: fromDate,
            dateTo: toDate,
            offset: offset,
            limit: setLimit,
            forward: true
        },
        json: true,
        headers: { 'auth': config.jwt }
    };
    return new Promise(function(resolve, reject) {
        request(options1).then(function(res) {
            var log = res.messages;
            var text;
            for (var y in log) {
                //console.log(y);
                if (log[y].components[0] && log[y].components[0].data && log[y].components[0].data.text) {
                    text = log[y].components[0].data.text;
                } else {
                    text = "";
                }
                var msg = text.replace(/(\r\n|\n|\r)/gm, " ");
                var obj = {} //comment this if defining your own obj as below
                //Custom meta tags added in the bot uncomment the below section if Custom meta tags needs to be extracted. The obj needs to be declared accordingly
                /*var obj = {
                    "customerId" :"N/A",
                    "email" : "N/A",
                    "LP Conversation ID" : "N/A",
                    "No.ofTimesConnectedToAgent" : "N/A",
                    "stateCode" : "N/A",
                    "RegistrationId" : "N/A"
                };

                if (log[y].tags && log[y].tags.userTags && log[y].tags.userTags.length > 0) {
                    var result = sorting(log[y].tags.userTags);
                    for (var i =0;i<result.length;i++){
                        var key = result[i].name;
                        obj[key] = result[i].value;
                    }
                }*/

                obj.type = log[y].type;
                obj.botId = log[y].botId;
                obj.sessionId = log[y].sessionId;
                obj.userId = log[y].createdBy; 
                obj.timeStampIST = timezone(log[y].createdOn).format('YYYY-MM-DDTHH:mm:ss.SSS') + " IST";
                obj.timeStampPST = timezone(log[y].createdOn).tz('America/Los_Angeles').format() + " PST";
                obj.channel = log[y].chnl;
                obj.message = msg ? msg.trim() : "";
                showDateInConsoleLog(log[y].createdOn);
                if (text) {
                    results.push(obj);
                }
            }
            if (res.moreAvailable === true) {
                console.log("\n[" + messageDate + "] More records available..recursively invoking fetch records. Offset= " + " " + offset);
                if (results.length > 1000) {
                    createLogsDumpsFromArray(false);
                }
                getKoraLogs(offset + setLimit, streamId);
            } else {
                console.log("[" + messageDate + "] Appending records with length  " + results.length + " to the file");
                console.log("[" + messageDate + "] No more records available");
                createLogsDumpsFromArray(true);
            }
        }).catch(function(err) {
            console.log('this is error', JSON.stringify(err));
            console.log("Retrying...\n\n");
            getKoraLogs(offset, streamId)
        });

    });
}

function showDateInConsoleLog(timestamp) {
    if (timestamp) {
        timestamp = timezone(timestamp).format('YYYY-MM-DD');
    }
    if (!messageDate) {
        messageDate = timestamp;
    } else {
        //display date in the console
        if (messageDate !== timestamp) {
            messageDate = timestamp;
        }
    }
}


function createLogsDumpsFromArray(isLastWrite) {
    results = _.orderBy(results, ["sessionId", "timeStamp"], ['asc', 'asc']);
    var newArray = results;
    jsonexport(newArray, function(err, csv) {
        if (err) return console.log('error', err);
        var writeStream = fs.appendFile(fileName, csv + "\n", function(err, res) {
            console.log("\n[" + messageDate + "] DISK WRITE: File updated with " + newArray.length + " records\n");
            //clear the results array to avoid duplication of records to be written
            results = [];
            if (isLastWrite) {
                var t1 = new Date().getTime();
                console.log("\n\n\n\nTOTAL TIME TAKEN: " + (t1 - t0) / 60000 + " minutes\n");
                //Send the report as email attachment. Uncomment the below section if you need to use the gmail service for sending mail.
                /*var mailList = config.mailList;
                mailOptions = {
                    from: config.user,
                    to: mailList,
                    subject: "Test Chat history extract for "+config.fromDate,
                    attachments: [{
                        filename: fileName,
                        path: __dirname+'/'+fileName
                    }],
                    text: "PFA the report for "+config.fromDate+" ."
                };
                sendMail.smtpTransport.sendMail(mailOptions, (err, res) => {
                    err ? console.log(err) : console.log("mail send", JSON.stringify(res));
                    sendMail.smtpTransport.close();
                })*/
            }
            if (err) console.log('error', err);
        });
    });
}
getKoraLogs(0, streamId);
