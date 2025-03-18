// 使用API
// Twitter API : 情報取得
// OpenAI API : サマリ作成 gpt-4o-mini
// Slack API : 通知
function fetchAndSummarizeTweets() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const twitterBearerToken = scriptProperties.getProperty('TWITTER_BEARER_TOKEN');
  const openAiApiKey = scriptProperties.getProperty('OPENAI_API_KEY');
  const slackToken = scriptProperties.getProperty('SLACK_BOT_TOKEN');
  const slackChannel = scriptProperties.getProperty('SLACK_CHANNEL');
  const listId = '1641010685714001920';
  
  // Twitter API - リストのツイート取得
  const twitterUrl = `https://api.twitter.com/2/lists/${listId}/tweets?tweet.fields=created_at,author_id,text&max_results=10`;
  const twitterHeaders = {
    'Authorization': `Bearer ${twitterBearerToken}`
  };
  
  const twitterResponse = UrlFetchApp.fetch(twitterUrl, {
    method: 'get',
    headers: twitterHeaders
  });
  
  const tweets = JSON.parse(twitterResponse.getContentText()).data;
  
  if (!tweets || tweets.length === 0) {
    Logger.log('No tweets found.');
    return;
  }
  
  const tweetTexts = tweets.map(tweet => tweet.text).join('\n\n');
  
  // OpenAI API - 要約
  const openAiUrl = 'https://api.openai.com/v1/chat/completions';
  const openAiHeaders = {
    'Authorization': `Bearer ${openAiApiKey}`,
    'Content-Type': 'application/json'
  };
  
  const openAiPayload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '以下のツイートを日本語で簡潔かつ情報価値の高い形で要約してください。' },
      { role: 'user', content: tweetTexts }
    ]
  };
  
  const openAiResponse = UrlFetchApp.fetch(openAiUrl, {
    method: 'post',
    headers: openAiHeaders,
    payload: JSON.stringify(openAiPayload)
  });
  
  const summary = JSON.parse(openAiResponse.getContentText()).choices[0].message.content;
  
  Logger.log(summary);
  
  // Slack 通知 (Tokenベース)
  const slackUrl = 'https://slack.com/api/chat.postMessage';
  const slackHeaders = {
    'Authorization': `Bearer ${slackToken}`,
    'Content-Type': 'application/json'
  };
  
  const slackPayload = {
    channel: slackChannel,
    text: `【Twitterリストの要約】\n${summary}`
  };
  
  UrlFetchApp.fetch(slackUrl, {
    method: 'post',
    headers: slackHeaders,
    payload: JSON.stringify(slackPayload)
  });
}
