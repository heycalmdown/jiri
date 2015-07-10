let _ = require('lodash');
let Promise = require('bluebird');
let superagent = require('superagent-promise')(require('superagent'), Promise);
let querystring = require('querystring');

// https://docs.atlassian.com/jira/REST/latest/
export default class Jiri {
  constructor(protocol, host, port, username, password, apiVersion) {
    this.protocol = protocol;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;
    this.apiVersion = apiVersion;
  }
  getBasicAuth() {
    let tok = this.username + ':' + this.password;
    let hash =  new Buffer(tok, 'binary').toString('base64');
    return 'Basic ' + hash;
  }
  getUri() {
    return `${this.protocol}://${this.host}:${this.port}/rest/api/${this.apiVersion}`;
  }
  GET(url) {
    return superagent.get(this.getUri() + url)
      .set('Authorization', this.getBasicAuth())
      .end().then(res => res.body);
  }
  POST(url, body) {
    return superagent.post(this.getUri() + url)
      .set('Authorization', this.getBasicAuth())
      .send(body).end().then(res => res.body);
  }
  PUT(url, body) {
    return superagent.put(this.getUri() + url)
      .set('Authorization', this.getBasicAuth())
      .send(body).end().then(res => res.body);
  }
  getCreateMeta() {
    return this.GET('/issue/createmeta');
  }
  getIssue(key) {
    return this.GET(`/issue/${key}`);
  }
  getProjects() {
    return this.getCreateMeta().then(o => o.projects.map(p => new Project(this, p)));
  }
  getProject(key) {
    return this.GET('/project/' + key).then(p => new Project(this, p));
  }
  getRemoteLink(key) {
    return this.GET(`/issue/${key}/remotelink`);
  }
  postRemoteLink(key, url, opts) {
    return this.POST(`/issue/${key}/remotelink`, {
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
  getSearch(jql, opts) {
    opts = opts || {};
    let qs = querystring.stringify(_.merge({}, {jql:jql}, opts));
    return this.GET('/search?' + qs);
  }
  editIssue(key, fields) {
    return this.editIssueFields(key, fields);
  }
  editIssueFields(key, fields) {
    return this.PUT('/issue/' + key, {fields: fields});
  }
  editIssueUpdate(key, update) {
    return this.PUT('/issue/' + key, {update: update});
  }
  getWorkLogs(key) {
    return this.GET('/issue/' + key + '/worklog');
  }
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
  postWorkLog(key, fields) {
    return this.POST('/issue/' + key + '/worklog', fields);
  }
}

class Project {
  constructor(jiri, project) {
    this.jiri = jiri;
    this.project = project;
    this.issueTypes = _.indexBy(this.project.issuetypes, 'name');
  }
  get key() {
    return this.project.key;
  }
  get name() {
    return this.project.name;
  }
  getComponents() {
    return this.jiri.GET('/project/' + this.key + '/components');
  }
  postStory(summary, description, fields_) {
    let fields = {
      project: { id: this.project.id },
      summary: summary,
      issuetype: { id: this.issueTypes.Story.id },
      description: description
    };
    if (fields_) {
      _.merge(fields, fields_);
    }
    return this.jiri.POST('/issue', {fields: fields});
  }
  getIssue(key) {
    return this.jiri.getIssue(key);
  }
}

// vim: set sts=2 sw=2 ts=2 ai et:
