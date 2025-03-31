// 使用API
// Slack API : 通知
function sendHackerNewsToSlack() {
  // Slack設定の取得
  var slackToken = PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
  var channel = PropertiesService.getScriptProperties().getProperty("SLACK_CHANNEL");
  if (!slackToken || !channel) {
    Logger.log("Slack Token またはチャンネルが設定されていません。");
    return;
  }

  // Hacker Newsの記事取得
  var url = "https://hacker-news.firebaseio.com/v0/topstories.json";
  var response = UrlFetchApp.fetch(url);
  var topStoryIDs = JSON.parse(response.getContentText()).slice(0, 10);
  
  // 記事の詳細を取得し、翻訳
  var translatedNews = topStoryIDs.map(function(id) {
    var storyUrl = "https://hacker-news.firebaseio.com/v0/item/" + id + ".json";
    var storyResponse = UrlFetchApp.fetch(storyUrl);
    var storyData = JSON.parse(storyResponse.getContentText());
    
    if (storyData && storyData.title) {
      var translatedTitle;
      try {
        translatedTitle = LanguageApp.translate(storyData.title, "en", "ja");
      } catch (e) {
        Logger.log("翻訳エラー: " + e.toString());
        translatedTitle = storyData.title;
      }
      return { title: translatedTitle, url: storyData.url };
    }
    return null;
  }).filter(Boolean);

  // Slackにメッセージを送信
  var message = "*HackerNews*\n" + translatedNews.map(function(story) {
    return "*" + story.title + "*\n<" + story.url + "|記事を読む>";
  }).join("\n");
  
  var payload = {
    channel: channel,
    text: message
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + slackToken },
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", options);
}