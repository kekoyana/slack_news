function fetchHackerNews() {
  var url = "https://hacker-news.firebaseio.com/v0/topstories.json";
  var response = UrlFetchApp.fetch(url);
  var topStoryIDs = JSON.parse(response.getContentText()).slice(0, 5);
  
  var stories = [];
  topStoryIDs.forEach(function(id) {
    var storyUrl = "https://hacker-news.firebaseio.com/v0/item/" + id + ".json";
    var storyResponse = UrlFetchApp.fetch(storyUrl);
    var storyData = JSON.parse(storyResponse.getContentText());
    if (storyData) {
      stories.push({ title: storyData.title, url: storyData.url });
    }
  });
  
  return stories;
}

function translateTitle(title) {
  try {
    return LanguageApp.translate(title, "en", "ja");
  } catch (e) {
    Logger.log("翻訳エラー: " + e.toString());
    return title;  // 翻訳に失敗した場合は元のタイトルを返す
  }
}

function sendToSlack(translatedNews) {
  var slackToken = PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
  var channel = PropertiesService.getScriptProperties().getProperty("SLACK_CHANNEL");
  if (!slackToken || !channel) {
    Logger.log("Slack Token またはチャンネルが設定されていません。");
    return;
  }
  
  var message = translatedNews.map(function(story) {
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

function main() {
  var news = fetchHackerNews();
  var translatedNews = news.map(function(story) {
    return { title: translateTitle(story.title), url: story.url };
  });
  sendToSlack(translatedNews);
}

