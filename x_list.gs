// 使用API
// Twitter API : 情報取得
// Google Gemini API : サマリ作成 gemini-pro
// Slack API : 通知
function fetchAndSummarizeTweets() {
    // 実行日を判定（月・水・金のみ実行）
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土
    if (![1, 3, 5].includes(dayOfWeek)) {
      Logger.log('本日は実行日ではありません（月・水・金以外）。スキップします。');
      return;
    }

  const scriptProperties = PropertiesService.getScriptProperties();
  const twitterBearerToken = scriptProperties.getProperty('TWITTER_BEARER_TOKEN');
  const geminiApiKey = scriptProperties.getProperty('GEMINI_API_KEY'); // Gemini APIキーを取得
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
  
  // Google Gemini API - 要約
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  const geminiHeaders = {
    'Content-Type': 'application/json'
  };

  const geminiPayload = {
    contents: [{
      parts: [{
        text: `以下のツイート群を日本語で簡潔かつ情報価値の高い形で要約してください。箇条書きや段落分けを適切に用い、重要な情報（特にリンクなど）は必ず含めてください。出力はslackのフォーマットで表示できるものにしてください。\n\n${tweetTexts}`
      }]
    }]
  };

  const geminiResponse = UrlFetchApp.fetch(geminiUrl, {
    method: 'post',
    headers: geminiHeaders,
    payload: JSON.stringify(geminiPayload),
    muteHttpExceptions: true // エラー時にもレスポンスを取得するため
  });

  const geminiResult = JSON.parse(geminiResponse.getContentText());

  // エラーハンドリングを追加
  if (!geminiResult.candidates || !geminiResult.candidates[0] || !geminiResult.candidates[0].content || !geminiResult.candidates[0].content.parts || !geminiResult.candidates[0].content.parts[0]) {
    Logger.log(`Gemini APIからの応答エラー: ${geminiResponse.getContentText()}`);
    // エラー内容をSlackにも通知（任意）
    const slackErrorPayload = {
      channel: slackChannel,
      text: `【Gemini API エラー】\n要約の取得に失敗しました。\n\`\`\`${geminiResponse.getContentText()}\`\`\``
    };
    UrlFetchApp.fetch(slackUrl, { // slackUrlは後続のコードで定義されている想定
      method: 'post',
      headers: slackHeaders, // slackHeadersは後続のコードで定義されている想定
      payload: JSON.stringify(slackErrorPayload)
    });
    return; // エラー発生時はここで処理を終了
  }

  const summary = geminiResult.candidates[0].content.parts[0].text;
  
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
