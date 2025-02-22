package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/slack-go/slack"
	"github.com/bregydoc/gtranslate"
)

type Story struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

func fetchHackerNews() []Story {
	resp, err := http.Get("https://hacker-news.firebaseio.com/v0/topstories.json")
	if err != nil {
		fmt.Println("Error fetching top stories:", err)
		return nil
	}
	defer resp.Body.Close()

	var topStoryIDs []int
	json.NewDecoder(resp.Body).Decode(&topStoryIDs)

	stories := []Story{}
	for _, id := range topStoryIDs[:5] {
		storyURL := fmt.Sprintf("https://hacker-news.firebaseio.com/v0/item/%d.json", id)
		storyResp, err := http.Get(storyURL)
		if err != nil {
			continue
		}
		defer storyResp.Body.Close()

		var story Story
		json.NewDecoder(storyResp.Body).Decode(&story)
		stories = append(stories, story)
	}

	return stories
}

func translateTitle(title string) string {
	translated, err := gtranslate.TranslateWithParams(title, gtranslate.TranslationParams{
		From: "auto",
		To:   "ja",
	})
	if err != nil {
		return title
	}
	return translated
}

func sendToSlack(translatedNews []Story) {
	slackToken := os.Getenv("SLACK_BOT_TOKEN")
	channel := os.Getenv("SLACK_CHANNEL")
	if slackToken == "" || channel == "" {
		fmt.Println("Slack Token またはチャンネルが設定されていません。")
		return
	}

	client := slack.New(slackToken)
	var messageParts []string
	for _, story := range translatedNews {
		messageParts = append(messageParts, fmt.Sprintf("*%s*\n<%s|記事を読む>", story.Title, story.URL))
	}

	message := strings.Join(messageParts, "\n")
	_, _, err := client.PostMessage(channel, slack.MsgOptionText(message, false))
	if err != nil {
		fmt.Println("Error sending message to Slack:", err)
	}
}

func main() {
	news := fetchHackerNews()
	var translatedNews []Story
	for _, story := range news {
		story.Title = translateTitle(story.Title)
		translatedNews = append(translatedNews, story)
	}
	sendToSlack(translatedNews)
}

