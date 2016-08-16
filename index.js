const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const rawBody = require('raw-body');
const inflate = require('inflation');
const crypto = require('crypto');
const cheerio = require('cheerio');
const GitHubApi = require("github");
const Promise = require('bluebird');

const watchUrl = process.env.URL || '/discourse-webhooks';
const port = process.env.PORT || 4000;
const secret = process.env.SECRET_KEY || '';
const discourseUrl = process.env.DISCOURSE_URL || '';
const githubRepo = process.env.GITHUB_REPO || '';
const githubUsername = process.env.GITHUB_USERNAME || 'discourse';
const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN || '';
const githubPullRequestRegexp = new RegExp(`github\\.com/${githubUsername}/${githubRepo}/pull/(\\d+)`, 'i')
const githubCustomHeaders = {
  'User-Agent': "discourse-webhook-bot"
}

router.post(watchUrl, (ctx, next) => {
  const headers = ctx.request.headers;
  const body = ctx.request.body;
  const rawBody = ctx.request.rawBody;

  if (headers['x-discourse-event-type'] !== 'post') {
    ctx.body = 'No interests.';
    return next();
  }

  const hmac = crypto.createHmac('sha256', secret);
  const hash = `sha256=${hmac.update(rawBody).digest('hex')}`;
  if (hash !== headers['x-discourse-event-signature']) {
    ctx.body = 'HMAC mismatched. Malformed payload.';
    return next();
  }

  // get url from the post
  let urlSet = new Set();
  const $ = cheerio.load(body.post.cooked);
  $('a').each((_, element) => {
    const url = $(element).attr('href');
    if (githubPullRequestRegexp.test(url)) {
      urlSet.add(url);
    }
  });
  if (urlSet.size === 0) {
    ctx.body = 'OK. No url matched in the post.';
    return next();
  }

  // github setup
  const github = new GitHubApi({
    debug: true,
    protocol: 'https',
    host: "api.github.com",
    headers: githubCustomHeaders,
    Promise: Promise,
    timeout: 5000
  });
  github.authenticate({
    type: 'oauth',
    token: githubAccessToken
  });

  // check existing comments on target pull requests
  let postPath = `/t/${body.post.topic_slug}/${body.post.topic_id}`;
  const postNumber = body.post.post_number;
  if (postNumber > 1) {
    postPath += `/${postNumber}`
  }

  let promises = [];
  urlSet.forEach(url => {
    let existLink = false;
    const found = url.match(githubPullRequestRegexp);
    const pullRequestId = found[1];
    promises.push(github.issues.getComments({
      user: githubUsername,
      repo: githubRepo,
      number: pullRequestId
    }).then(json => {
      json.forEach(comment => {
        if (comment.body.indexOf(postPath) !== -1) {
          existLink = true;
        }
      });

      while (github.hasNextPage(json)) {
        github.getNextPage(json, githubCustomHeaders).then(json => {
          json.forEach(comment => {
            if (comment.body.indexOf(postPath) !== -1) {
              existLink = true;
            }
          });
        });
      }
    }).then(() => {
      if (existLink) {
        ctx.body = 'OK. Skip, found existing link.'
      } else {
        github.issues.createComment({
          user: githubUsername,
          repo: githubRepo,
          number: pullRequestId,
          body: `\`@${body.user.username}\` mentioned this pull request. See ${discourseUrl}${postPath}.`
        });
        ctx.body = 'OK. New link created.';
      }
    }));
  });

  return Promise.all(promises).then(() => { return next(); });
});

app
  .use((ctx, next) => {
    let req = ctx.req || ctx;
    let opts = {
      encoding: 'utf8',
      limit: '1mb'
    }
    rawBody(inflate(req), opts).then(str => {
      ctx.request.rawBody = str;
    });
    return next();
  })
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(port);
