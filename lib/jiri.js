'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _ = require('lodash');
var Promise = require('bluebird');
var superagent = require('superagent-promise')(require('superagent'), Promise);
var querystring = require('querystring');

// https://docs.atlassian.com/jira/REST/latest/

var Jiri = (function () {
  function Jiri(protocol, host, port, username, password, apiVersion) {
    _classCallCheck(this, Jiri);

    this.protocol = protocol;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.apiVersion = apiVersion;
  }

  _createClass(Jiri, [{
    key: 'getBasicAuth',
    value: function getBasicAuth() {
      var tok = this.username + ':' + this.password;
      var hash = new Buffer(tok, 'binary').toString('base64');
      return 'Basic ' + hash;
    }
  }, {
    key: 'getUri',
    value: function getUri() {
      return '' + this.protocol + '://' + this.host + ':' + this.port + '/rest/api/' + this.apiVersion;
    }
  }, {
    key: 'GET',
    value: function GET(url) {
      return superagent.get(this.getUri() + url).set('Authorization', this.getBasicAuth()).end().then(function (res) {
        return res.body;
      });
    }
  }, {
    key: 'POST',
    value: function POST(url, body) {
      return superagent.post(this.getUri() + url).set('Authorization', this.getBasicAuth()).send(body).end().then(function (res) {
        return res.body;
      });
    }
  }, {
    key: 'PUT',
    value: function PUT(url, body) {
      return superagent.put(this.getUri() + url).set('Authorization', this.getBasicAuth()).send(body).end().then(function (res) {
        return res.body;
      });
    }
  }, {
    key: 'getCreateMeta',
    value: function getCreateMeta() {
      return this.GET('/issue/createmeta');
    }
  }, {
    key: 'getIssue',
    value: function getIssue(key) {
      return this.GET('/issue/' + key);
    }
  }, {
    key: 'getProjects',
    value: function getProjects() {
      var _this = this;

      return this.getCreateMeta().then(function (o) {
        return o.projects.map(function (p) {
          return new Project(_this, p);
        });
      });
    }
  }, {
    key: 'getProject',
    value: function getProject(key) {
      var _this2 = this;

      return this.GET('/project/' + key).then(function (p) {
        return new Project(_this2, p);
      });
    }
  }, {
    key: 'getRemoteLink',
    value: function getRemoteLink(key) {
      return this.GET('/issue/' + key + '/remotelink');
    }
  }, {
    key: 'postRemoteLink',
    value: function postRemoteLink(key, url, opts) {
      return this.POST('/issue/' + key + '/remotelink', {
        globalId: 'system=' + url,
        application: opts.application,
        relationship: 'causes',
        object: {
          url: url,
          title: opts.title,
          summary: opts.summary,
          status: opts.status
        }
      });
    }
  }, {
    key: 'getSearch',
    value: function getSearch(jql, opts) {
      opts = opts || {};
      var qs = querystring.stringify(_.merge({}, { jql: jql }, opts));
      return this.GET('/search?' + qs);
    }
  }, {
    key: 'editIssue',
    value: function editIssue(key, fields) {
      return this.editIssueFields(key, fields);
    }
  }, {
    key: 'editIssueFields',
    value: function editIssueFields(key, fields) {
      return this.PUT('/issue/' + key, { fields: fields });
    }
  }, {
    key: 'editIssueUpdate',
    value: function editIssueUpdate(key, update) {
      return this.PUT('/issue/' + key, { update: update });
    }
  }, {
    key: 'getWorkLogs',
    value: function getWorkLogs(key) {
      return this.GET('/issue/' + key + '/worklog');
    }
  }, {
    key: 'postWorkLog',

    /*
     * https://docs.atlassian.com/jira/REST/latest/#d2e738
     * "new" - sets the estimate to a specific value
     * "leave"- leaves the estimate as is
     * "manual" - specify a specific amount to increase remaining estimate by
     * "auto"- Default option. Will automatically adjust the value based on the new timeSpent specified on the worklog
     *
     * only support "auto"
     */
    /*
     * https://jira.atlassian.com/browse/JRA-30197
     * 다른 사람 이름으로 워크 로그를 남기는 건 아직 안 되는 모양이다.
     */
    value: function postWorkLog(key, fields) {
      return this.POST('/issue/' + key + '/worklog', fields);
    }
  }]);

  return Jiri;
})();

exports['default'] = Jiri;

var Project = (function () {
  function Project(jiri, project) {
    _classCallCheck(this, Project);

    this.jiri = jiri;
    this.project = project;
    this.issueTypes = _.indexBy(this.project.issuetypes, 'name');
  }

  _createClass(Project, [{
    key: 'getComponents',
    value: function getComponents() {
      return this.jiri.GET('/project/' + this.key + '/components');
    }
  }, {
    key: 'postStory',
    value: function postStory(summary, description, fields_) {
      var fields = {
        project: { id: this.project.id },
        summary: summary,
        issuetype: { id: this.issueTypes.Story.id },
        description: description
      };
      if (fields_) {
        _.merge(fields, fields_);
      }
      return this.jiri.POST('/issue', { fields: fields });
    }
  }, {
    key: 'getIssue',
    value: function getIssue(key) {
      return this.jiri.getIssue(key);
    }
  }, {
    key: 'key',
    get: function () {
      return this.project.key;
    }
  }, {
    key: 'name',
    get: function () {
      return this.project.name;
    }
  }]);

  return Project;
})();

module.exports = exports['default'];

// vim: set sts=2 sw=2 ts=2 ai et: