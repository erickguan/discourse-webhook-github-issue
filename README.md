# discourse-webhook-github-issue

This bot is a demo for Discourse webhooks which mades it parts of GSoC. The bot can be deployed on heroku or your server.

## Config

Firstly, you'll need to set up a Github user to comment. Create an account and prove you are not a robot.

Secondly, you need an personal access token to allow bot to access.

![User setting](/docs/user-setting.png)

![Personal access tokens](/docs/personal-access-tokens-index.png)

![New personal access token](/docs/new-personal-access-token.png)

![Copy personal access token](/docs/copy-personal-access-token.png)

At last, keep your code safe.

### envs

There are some envs you need to set up in the setting page.

- `URL`: The payload url path which the service operates on. E.g. `/discourse-webhooks`
- `PORT`: The port monitoring, if TLS `443`, otherwise 80.
- `SECRET_KEY`: Match the secret key you configured in the Discourse settings. E.g. `a_secret_key_for_webhook`
- `GITHUB_USERNAME`: The github user you are operating on. E.g. `discourse`
- `GITHUB_REPO`: The github repo you are operating on under the configured user. E.g. `discourse`
- `GITHUB_ACCESS_TOKEN`: From previous step.
- `DISCOURSE_URL`: Discourse url prefix without tailing slash. E.g. `http://meta.discourse.org`
