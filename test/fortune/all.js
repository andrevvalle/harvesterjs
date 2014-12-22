var inflect = require('i')();
var should = require('should');
var _ = require('lodash');
var RSVP = require('rsvp');
var request = require('supertest');

var Promise = RSVP.Promise;
var fixtures = require('./../fixtures.json');

var baseUrl = 'http://localhost:' + process.env.PORT;
var keys = {};

_.each(fixtures, function (resources, collection) {
    keys[collection] = inflect.pluralize(collection);
});

describe('using mongodb adapter', function () {
    var ids = {};

    before(function (done) {
        this.app
            .then(function (fortuneApp) {
                var createResources = [];

                _.each(fixtures, function (resources, collection) {
                    var key = keys[collection];

                    createResources.push(new Promise(function (resolve) {
                        var body = {};
                        body[key] = resources;
                        request(baseUrl)
                            .post('/' + key)
                            .send(body)
                            .expect('Content-Type', /json/)
                            .expect(201)
                            .end(function (error, response) {
                                should.not.exist(error);
                                var resources = JSON.parse(response.text)[key];
                                ids[key] = ids[key] || [];
                                resources.forEach(function (resource) {
                                    ids[key].push(resource.id);
                                });
                                resolve();
                            });
                    }));
                });

                return RSVP.all(createResources).then(function() {
                    done();
                });
            })
            .catch(function (err) {
                done(err);
            });
    });


    require("./resources")(baseUrl,keys,ids);
    require("./associations")(baseUrl,keys,ids);
    require("./limits")(baseUrl,keys,ids);
    require("./jsonapi_error")(baseUrl,keys,ids);


    after(function (done) {
        _.each(fixtures, function (resources, collection) {
            var key = keys[collection];

            RSVP.all(ids[key].map(function (id) {
                return new Promise(function (resolve) {
                    request(baseUrl)
                        .del('/' + key + '/' + id)
                        .expect(204)
                        .end(function (error) {
                            should.not.exist(error);
                            resolve();
                        });
                });
            })).then(function () {
                done();
            }, function () {
                throw new Error('Failed to delete resources.');
            });
        });
    });

});