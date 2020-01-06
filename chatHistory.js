var request = require('request-promise');
var _ = require('lodash');
var fs = require('fs');
var timezone = require("moment-timezone");
var Promise = require('bluebird').config({ warnings: { wForgottenReturn: false } });;
var config = require("./config");
var streamId = config.streamId;
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

console.log("\n\n" + "Initiating the conversation history download...\n\n");
console.log("The output will be written to " + fileName + "  \n\n");

function getKoraLogs(offset, streamId) {
    console.log("Retrieving records with offset " + offset + "...\n");
    var options1 = {
        method: 'POST',
        url: 'https://bots.kore.ai/api/public/stream/' + streamId + '/getMessages',
        body:
        {
            dateFrom: fromDate,
            dateTo: toDate,
            offset: offset,
            limit: setLimit,
            forward: true
        },
        json: true,
        headers: { 'auth': config.jwt }
    };
    return new Promise(function (resolve, reject) {
        request(options1).then(function (res) {
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
                var obj = {};
                obj.type = log[y].type;
                obj.botId = log[y].botId;
                obj.sessionId = log[y].sessionId;
                obj.userId = log[y].createdBy;
                obj.timeStamp = timezone(log[y].createdOn).format('YYYY-MM-DDTHH:mm:ss.SSS') + ' PST';
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
                setTimeout(function () {
                    getKoraLogs(offset + setLimit, streamId);
                }, 1000);
            } else {
                console.log("[" + messageDate + "] Appending records with length  " + results.length + " to the file");
                console.log("[" + messageDate + "] No more records available");
                createLogsDumpsFromArray(true);
            }
        }).catch(function (err) {
            console.log('error', JSON.stringify(err));
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
    jsonexport(newArray, function (err, csv) {
        if (err) return console.log('error', err);
        var writeStream = fs.appendFile(fileName, csv, function (err, res) {
            console.log("\n[" + messageDate + "] DISK WRITE: File updated with " + newArray.length + " records\n");
            //clear the results array to avoid duplication of records to be written
            results = [];
            if (isLastWrite) {
                var t1 = new Date().getTime();
                console.log("\n\n\n\nTOTAL TIME TAKEN: " + (t1 - t0) / 60000 + " minutes\n");
            }
            if (err) console.log('error', err);
        });
    });
}
getKoraLogs(0, streamId);
