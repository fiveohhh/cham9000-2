const express = require("express");
const _ = require("lodash");
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser.json());

var Validator = require("jsonschema").Validator;

const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

// Connection URL
const url = "mongodb://localhost:27017";

// Database Name
const dbName = "cham9000";

db = null;

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  db = client.db(dbName);
  console.log("Connected correctly to server");

  app.listen(3000, () => console.log("Example app listening"));
});

// Takes incoming data and stamps it as now
app.post("/device-data-now", (req, res) => {
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      devices: {
        type: "array",
        items: {
          $ref: "#/definitions/device_report"
        }
      }
    },
    required: ["devices"],
    definitions: {
      device_report: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          metrics: {
            type: "array",
            items: {
              $ref: "#/definitions/metric"
            }
          }
        },
        required: ["id", "metrics"]
      },
      metric: {
        type: "object",
        properties: {
          name: {
            type: "string"
          },
          value: {
            type: ["string", "boolean", "object", "number"]
          }
        },
        required: ["name", "value"]
      }
    }
  };
  var vv = new Validator();
  const v = vv.validate(req.body, schema);
  if (v.errors.len > 0) {
    res.status = 400;
    res.send("wrong stuff");
    return;
  }
  results = [];
  var date = new Date();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const millis = date.getMilliseconds();
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  // for now we'll say 1 second res per
  // take some request data and store it
  _.forEach(req.body.devices, dev => {
    _.forEach(dev.metrics, metric => {
      const thingToInsert = {
        device_id: dev.id,
        hour: date.toISOString(),
        metric_name: metric.metric_name
      };
      /*db.metrics.update(
        { 
          timestamp_hour: ISODate("2013-10-10T23:00:00.000Z"),
          type: “memory_used”
        }, 
        {$set: {“values.59.59”: 2000000 } }
      )*/

      const writeData = {};
      writeData[`values.${minutes}.${seconds}`] = metric.value;

      db
        .collection("device")
        .updateOne(thingToInsert, { $set: writeData }, function(err, r) {
          assert.equal(null, err);
          assert.equal(1, r.insertedCount);
          console.log(r);
          results.push(dev);
        });
    });
  });

  res.send(results);
});
