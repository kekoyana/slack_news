/**
 * 取得するGitHubトレンド件数
 */
var MAX_TRENDING_COUNT = 20;

// 使用API
// Slack API : 通知
function githubTrendingToSlack() {
  // メイン処理
  var url = 'https://github.com/trending';
  var response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  
  if (response.getResponseCode() !== 200) {
    Logger.log('Failed to fetch GitHub Trending page');
    return;
  }
  
  var html = response.getContentText();
  
  // articleタグから情報を取得
  var articles = html.match(/<article class="Box-row">[\s\S]*?<\/article>/g);
  if (!articles) {
    Logger.log('No trending repositories found');
    return;
  }
  
  var trendingRepos = articles.slice(0, MAX_TRENDING_COUNT).map(function(article) {
    try {
      // リポジトリリンクを取得（h2内のLink classを持つa要素）
      var repoMatch = article.match(/<h2[^>]*>[\s\S]*?<a[^>]*?href="(\/[^"\/]+\/[^"\/]+)"[^>]*?class="Link">/);
      if (!repoMatch) return null;
      
      var repoPath = repoMatch[1];
      // スポンサーシップページとトレンドページのリンクを除外
      if (repoPath.includes('/trending/') || repoPath.includes('/sponsors/')) {
        return null;
      }
      
      // 説明文を取得
      var descriptionMatch = article.match(/<p class="col-9[^"]*"[^>]*>([^<]+)<\/p>/);
      var description = descriptionMatch ? descriptionMatch[1].trim() : '説明がありません';
      
      // 説明文を日本語に翻訳
      var jpDescription;
      try {
        jpDescription = LanguageApp.translate(description, 'en', 'ja');
      } catch (e) {
        Logger.log('Translation failed: ' + e.message);
        jpDescription = description;  // 翻訳に失敗した場合は原文を使用
      }
      
      // プログラミング言語を取得
      var langMatch = article.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
      var language = langMatch ? langMatch[1] : '';

      // 今日のスター数を取得（float-sm-rightクラス内）
      var starsMatch = article.match(/(\d+(?:,\d+)*)\s+stars today/);
      var starsToday = starsMatch ? starsMatch[1].replace(/,/g, '') : '0';
      
      return {
        url: 'https://github.com' + repoPath,
        description: description,
        jpDescription: jpDescription,
        starsToday: starsToday,
        language: language
      };
    } catch (e) {
      Logger.log('Error parsing repository article: ' + e.message);
      return null;
    }
  }).filter(function(repo) {
    return repo !== null;
  });
  
  if (trendingRepos.length === 0) {
    Logger.log('No valid trending repositories found');
    return;
  }
  
  // メッセージのフォーマット
  var message = '*今日のGitHub Trending TOP10*\n\n' +
    trendingRepos.map(function(repo, index) {
      return `${index + 1}. ${repo.url} : ⭐️ ${repo.starsToday}${repo.language ? ' ' + repo.language : ''}\n` +
        `${repo.jpDescription}`;
    }).join('\n\n');
  
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  var channel = PropertiesService.getScriptProperties().getProperty('SLACK_CHANNEL');
  
  var payload = {
    channel: channel,
    text: message,
    username: 'GitHub Trending Bot',
    unfurl_links: false,  // リンクのプレビューを無効化
    unfurl_media: false   // メディアのプレビューを無効化
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    var slackResponse = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', options);
    var responseData = JSON.parse(slackResponse.getContentText());
    if (!responseData.ok) {
      Logger.log('Failed to send message to Slack: ' + responseData.error);
    }
  } catch (e) {
    Logger.log('Error sending message to Slack: ' + e.message);
  }
}
