var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gutil = require('gulp-util');
var AWS = require('aws-sdk');
var Q = require('q');
var gutil = require('gulp-util');

module.exports = function(options) {

    var cloudfront = new AWS.CloudFront({
        accessKeyId: options.key,
        secretAccessKey: options.secret
    });

    var updateDefaultRootObject = function (defaultRootObject, dist) {

        var deferred = Q.defer();

        // Get the existing distribution id
        cloudfront.getDistribution({ Id: dist.id }, function(err, data) {

            if (err) {
                deferred.reject(err);
            } else {

                // AWS Service returns errors if we don't fix these
                if (data.DistributionConfig.Comment === null) data.DistributionConfig.Comment = '';
                if (data.DistributionConfig.Logging.Enabled === false) {
                    data.DistributionConfig.Logging.Bucket = '';
                    data.DistributionConfig.Logging.Prefix = '';
                }

                // Causing problems on a default cloudfront setup, why is this needed?
                if (data.DistributionConfig.Origins.Items instanceof Array && data.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity === null) {
                    data.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity = '';
                }

                if (data.DistributionConfig.DefaultRootObject === defaultRootObject.substr(1)) {
                    gutil.log('gulp-cloudfront:', "DefaultRootObject hasn't changed, not updating.");
                    return deferred.resolve();
                }

                // Update the distribution with the new default root object (trim the precedeing slash)
                data.DistributionConfig.DefaultRootObject = defaultRootObject.substr(1);
                data.DistributionConfig.CustomErrorResponses.Items[0].ResponsePagePath = defaultRootObject;

                // Loop through this for each distribution
                cloudfront.updateDistribution({
                    IfMatch: data.ETag,
                    Id: dist.id,
                    DistributionConfig: data.DistributionConfig
                    }, function(err, data) {

                        if (err) {
                            deferred.reject(err);
                        } else {
                            gutil.log('gulp-cloudfront:', '('+ dist.name +') update error path to [' + defaultRootObject.substr(1)+']');
                            gutil.log('gulp-cloudfront:', '('+ dist.name +') DefaultRootObject updated to [' + defaultRootObject.substr(1) + '].');
                            deferred.resolve();
                        }

                    });
                
                

            }
        });

        return deferred.promise;

    };

    return {
        updateDefaultRootObject: updateDefaultRootObject
    };

};
