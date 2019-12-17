var request = require('request-promise');
var _ = require('lodash');
var fs = require('fs');
var timezone = require("moment-timezone");
var Promise = require('bluebird').config({ warnings: { wForgottenReturn: false } });;
var config = require("./config");
var streamId = config.streamId;
var environment = config.environment;
var results = [];

var messageDate;

//new variables
var setLimit = 100;
var count = 0;
var d = new Date();
var fileName = "report" + d.getDate() + "_" + (d.getMonth() + 1) + "_" + d.getFullYear() + "_" + d.getHours() + "_" + d.getMinutes();
fileName += ".csv";
var t0 = new Date().getTime();
var userCount = 0;

//just some fancy colours
var colours = ["\x1b[36m%s\x1b[0m", "\x1b[35m%s\x1b[0m", "\x1b[32m%s\x1b[0m", "\x1b[45m%s\x1b[0m", "\x1b[0m"];

var head = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'auth': config.jwt
};
var fromDate = config.fromDate;
var toDate = config.toDate;
var body = {
    "dateFrom": fromDate,
    "dateTo": toDate,
    "limit": setLimit
};

var usersData;
var jsonexport = require('jsonexport');
function getChatHistory() {

    console.log("\n\n" + colours[0], "Initiating the conversation history download...\n\n");

    console.log(colours[0], "The output will be written to " + fileName + "  \n\n");

    var options = {
        method: 'POST',
        uri: 'https://bots.kore.ai/api/public/stream/' + streamId + '/getSessions',
        headers: head,
        body: body,
        json: true
    };

    //Trigger the download process

    //Ignore the hardcoded userId.
    getKoraLogs(12, 0, streamId);


}

/**
	Gets recursively called to fetch the conversational history

**/

function getKoraLogs(userId, offset, streamId) {
    console.log(colours[0], "Retrieving records with offset " + offset + "...\n");
    var options1 = {
        method: 'POST',
        url: 'https://' + environment + '/api/public/stream/' + streamId + '/getMessages',
        body:
        {
            dateFrom: fromDate,
            dateTo: toDate,
            offset: offset,
            limit: setLimit
        },
        json: true,
        headers: { 'auth': config.jwt }
    };
    return new Promise(function (resolve, reject) {
        request(options1).then(function (res) {
            //console.log(JSON.stringify(res));
            var chats = [];
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
                    //count = count + 1;
                    results.push(obj);
                }
            }
            if (res.moreAvailable === true) {
                console.log(colours[0], "\n[" + messageDate + "] More records available..recursively invoking fetch records. Offset= " + " " + offset);
                getKoraLogs(userId, offset + setLimit, streamId);
                if (results.length > 1000) {
                    console.log(colours[0], "[" + messageDate + "] Appending records with offset " + results.length + " to the file");
                    createLogsDumpsFromArray(false);
                }
            } else {
                console.log(colours[0], "[" + messageDate + "] Appending records with offset less than 1000 and length  " + results.length + " to the file");
                console.log(colours[0], "[" + messageDate + "] No more records available");
                createLogsDumpsFromArray(true);
            }
        }).catch(function (err) {
            console.log(err, "");
            console.log("\x1b[45m%s\x1b[0m", "Retrying...\n\n");
            getKoraLogs(userId, offset, streamId)
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

/**
	Writes the file to the disk. 
	Recommended to write the records in bulk

	The input param is true when its the final write to the file.
**/
function createLogsDumpsFromArray(isLastWrite) {
    results = _.orderBy(results, ["sessionId", "timeStamp"], ['asc', 'asc']);
    var newArray = results;
    jsonexport(newArray, function (err, csv) {
        if (err) return console.log(err);
        var writeStream = fs.appendFile(fileName, csv, function (err, res) {
            console.log(colours[1], "\n[" + messageDate + "] DISK WRITE: File updated with " + newArray.length + " records\n");
            //clear the results array to avoid duplication of records to be written
            results = [];
            if (isLastWrite) {
                var t1 = new Date().getTime();
                console.log(colours[2], "\n\n\n\nTOTAL TIME TAKEN: " + (t1 - t0) / 60000 + " minutes\n");
            }
            if (err) console.log('error', err);
        });
    });
}
getChatHistory();